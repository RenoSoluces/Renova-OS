/*
  VT : le commercial réalise et valide la visite ; l'Admin détermine ensuite
  le produit/type de VT utilisé pour le calcul de la commission.

  Le champ produit_cible existant reste celui du parcours d'audit technique.
  commission_produit_id est volontairement séparé : il ne peut pas être choisi
  par le commercial et sert uniquement au rattachement de la rémunération.
*/

ALTER TABLE visites
  ADD COLUMN IF NOT EXISTS commission_produit_id uuid
  REFERENCES catalogue_produits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visites_commission_produit_id
  ON visites(commission_produit_id);

CREATE OR REPLACE FUNCTION fn_sync_commission_vt_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bareme_vt commission_bareme%ROWTYPE;
  v_commercial_id uuid;
  m_commercial numeric;
  m_societe numeric;
  v_produit_nom text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM commissions
    WHERE reference_type = 'visites'
      AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Tant que l'Admin n'a pas déterminé le type de VT, aucune commission
  -- ne doit être créée.
  IF NEW.statut = 'terminee' AND NEW.commission_produit_id IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR OLD.statut IS DISTINCT FROM 'terminee'
       OR OLD.commission_produit_id IS DISTINCT FROM NEW.commission_produit_id
     ) THEN
    SELECT p.commercial_id
      INTO v_commercial_id
      FROM prospects p
     WHERE p.id = NEW.prospect_id;

    IF v_commercial_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT *
      INTO bareme_vt
      FROM commission_bareme
     WHERE type = 'vt'
       AND actif = true
       AND (commercial_id IS NULL OR commercial_id = v_commercial_id)
       AND (produit_id IS NULL OR produit_id = NEW.commission_produit_id)
       AND (date_debut IS NULL OR date_debut <= COALESCE(NEW.date_visite, CURRENT_DATE))
       AND (date_fin IS NULL OR date_fin >= COALESCE(NEW.date_visite, CURRENT_DATE))
     ORDER BY
       ((commercial_id IS NOT NULL)::int + (produit_id IS NOT NULL)::int) DESC,
       priorite DESC,
       created_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    m_commercial := COALESCE(bareme_vt.montant_commercial, 0);
    m_societe := COALESCE(bareme_vt.montant_societe, 0);

    SELECT nom INTO v_produit_nom
      FROM catalogue_produits
     WHERE id = NEW.commission_produit_id;

    INSERT INTO commissions (
      commercial_id,
      type,
      libelle,
      reference_type,
      reference_id,
      montant_commercial,
      montant_societe,
      statut
    ) VALUES (
      v_commercial_id,
      'vt',
      'Visite technique' || CASE WHEN v_produit_nom IS NOT NULL THEN ' — ' || v_produit_nom ELSE '' END || ' — ' || COALESCE(NEW.date_visite::text, NEW.created_at::date::text, ''),
      'visites',
      NEW.id,
      m_commercial,
      m_societe,
      'en_attente'
    )
    ON CONFLICT (reference_type, reference_id) DO UPDATE SET
      commercial_id = EXCLUDED.commercial_id,
      libelle = EXCLUDED.libelle,
      montant_commercial = EXCLUDED.montant_commercial,
      montant_societe = EXCLUDED.montant_societe,
      statut = CASE
        WHEN commissions.statut = 'payee' THEN commissions.statut
        ELSE 'en_attente'
      END;

  ELSIF TG_OP = 'UPDATE'
        AND OLD.statut = 'terminee'
        AND (
          NEW.statut IS DISTINCT FROM 'terminee'
          OR NEW.commission_produit_id IS NULL
        ) THEN
    DELETE FROM commissions
     WHERE reference_type = 'visites'
       AND reference_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_vt_validation ON visites;
CREATE TRIGGER trg_sync_commission_vt_validation
  AFTER INSERT OR UPDATE OF statut, commission_produit_id OR DELETE
  ON visites
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_commission_vt_validation();


-- Protection métier : le commercial ne peut pas déterminer lui-même le type
-- de VT servant à sa rémunération, même en contournant l'interface.
CREATE OR REPLACE FUNCTION fn_guard_vt_commission_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_produit_id IS DISTINCT FROM OLD.commission_produit_id
     AND NOT is_admin_ou_manager() THEN
    RAISE EXCEPTION 'Seul un administrateur ou manager peut déterminer le type de VT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_vt_commission_product ON visites;
CREATE TRIGGER trg_guard_vt_commission_product
  BEFORE UPDATE OF commission_produit_id
  ON visites
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_vt_commission_product();
