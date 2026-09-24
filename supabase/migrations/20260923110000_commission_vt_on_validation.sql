/*
  VT : la commission est générée uniquement lorsque la visite technique est validée.

  Règle métier :
    Visite technique -> statut 'terminee' -> commission VT créée.

  Le planning sert uniquement à planifier la VT. La création d'une commission
  ne dépend ni d'un devis ni d'un dossier.
*/

-- L'ancien trigger générait la commission dès la création de l'événement planning.
DROP TRIGGER IF EXISTS trg_sync_commission_vt ON planning_events;
DROP FUNCTION IF EXISTS fn_sync_commission_vt();

-- Une VT validée est la visite dont le statut passe à 'terminee'.
CREATE OR REPLACE FUNCTION fn_create_commission_vt_on_validation()
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
  -- Suppression d'une VT : supprimer sa commission éventuelle.
  IF TG_OP = 'DELETE' THEN
    DELETE FROM commissions
    WHERE reference_type = 'visites'
      AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Une commission VT n'existe qu'à la validation de la visite.
  IF NEW.statut = 'terminee'
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'terminee') THEN

    -- Le commercial responsable est celui du prospect.
    SELECT p.commercial_id
      INTO v_commercial_id
    FROM prospects p
    WHERE p.id = NEW.prospect_id;

    -- Sans commercial rattaché, on ne crée pas une commission commerciale
    -- attribuée à tort. La VT reste validée et pourra être régularisée ensuite.
    IF v_commercial_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO bareme_vt
    FROM commission_bareme
    WHERE type = 'vt'
      AND actif = true
      AND (date_debut IS NULL OR date_debut <= COALESCE(NEW.date_visite, CURRENT_DATE))
      AND (date_fin IS NULL OR date_fin >= COALESCE(NEW.date_visite, CURRENT_DATE))
    ORDER BY priorite DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF bareme_vt.id IS NULL THEN
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
      'Visite technique — ' || COALESCE(NEW.id::text, ''),
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
      montant_societe = EXCLUDED.montant_societe;

  ELSIF NEW.statut IS DISTINCT FROM 'terminee' THEN
    -- Si une VT précédemment validée est réouverte, sa commission est retirée.
    DELETE FROM commissions
    WHERE reference_type = 'visites'
      AND reference_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_commission_vt_on_validation ON visites;
CREATE TRIGGER trg_create_commission_vt_on_validation
  AFTER INSERT OR UPDATE OF statut, prospect_id, date_visite
  OR DELETE
  ON visites
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_commission_vt_on_validation();
