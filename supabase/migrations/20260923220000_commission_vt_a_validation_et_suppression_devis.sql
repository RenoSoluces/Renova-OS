/*
  VT : la commission est créée uniquement lorsque la visite technique est validée.

  Flux métier :
    visite technique -> audit -> validation (visites.statut = 'terminee') -> commission VT

  Le devis n'est jamais requis pour une VT.

  Devis : seul un admin/manager peut supprimer un devis depuis l'application.
  Les lignes/aides sont déjà en ON DELETE CASCADE, le lien dossier est en SET NULL.
  La commission liée à un devis supprimé est également supprimée.
*/

-- ── 1. Désactiver l'ancien déclenchement VT depuis planning_events ──────────
DROP TRIGGER IF EXISTS trg_sync_commission_vt ON planning_events;
DROP FUNCTION IF EXISTS fn_sync_commission_vt();

-- ── 2. Générer la commission VT à la validation de la vraie visite ──────────
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
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM commissions
    WHERE reference_type = 'visites'
      AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Une VT ne devient commissionnable qu'à sa validation.
  IF NEW.statut = 'terminee' AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'terminee') THEN
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
     ORDER BY created_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    m_commercial := COALESCE(bareme_vt.montant_commercial, 0);
    m_societe := COALESCE(bareme_vt.montant_societe, 0);

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
      'Visite technique — ' || COALESCE(NEW.date_visite::text, NEW.created_at::date::text, ''),
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

  ELSIF OLD.statut = 'terminee' AND NEW.statut IS DISTINCT FROM 'terminee' THEN
    DELETE FROM commissions
     WHERE reference_type = 'visites'
       AND reference_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_vt_validation ON visites;
CREATE TRIGGER trg_sync_commission_vt_validation
  AFTER INSERT OR UPDATE OF statut OR DELETE
  ON visites
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_commission_vt_validation();

-- ── 3. Suppression d'une commission lorsqu'un devis est supprimé ───────────
CREATE OR REPLACE FUNCTION fn_delete_commission_devis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM commissions
   WHERE reference_type = 'devis'
     AND reference_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_commission_devis ON devis;
CREATE TRIGGER trg_delete_commission_devis
  AFTER DELETE ON devis
  FOR EACH ROW
  EXECUTE FUNCTION fn_delete_commission_devis();

-- ── 4. Seul l'admin/manager peut supprimer des devis ───────────────────────
DROP POLICY IF EXISTS "anon_delete_devis" ON devis;
DROP POLICY IF EXISTS "devis_delete_admin" ON devis;
CREATE POLICY "devis_delete_admin"
  ON devis
  FOR DELETE TO authenticated
  USING (is_admin_ou_manager());
