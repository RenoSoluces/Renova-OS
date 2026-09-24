/*
  Commission VT : la commission est créée uniquement lorsque la visite technique
  est validée, et non plus lors de sa simple planification dans l'agenda.

  Flux métier :
    Visite technique -> audit terminé -> statut 'terminee' -> commission VT.

  Une VT n'a pas besoin de devis client : elle est payée par le partenaire.
*/

-- Les anciennes commissions créées prématurément depuis l'agenda ne doivent
-- plus exister : elles seront recréées au moment de la validation de la VT.
DELETE FROM commissions
WHERE reference_type = 'planning_events'
  AND type = 'vt';

-- Désactivation définitive de l'ancien déclencheur sur l'agenda.
DROP TRIGGER IF EXISTS trg_sync_commission_vt ON planning_events;

-- Génération de la commission à la validation de la vraie VT.
CREATE OR REPLACE FUNCTION fn_sync_commission_vt_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r commission_bareme%ROWTYPE;
  v_commercial_id uuid;
  m_commercial numeric;
  m_societe numeric;
BEGIN
  -- Une commission n'est générée qu'au passage à 'terminee'.
  IF NEW.statut <> 'terminee' THEN
    IF TG_OP = 'UPDATE' AND OLD.statut = 'terminee' THEN
      DELETE FROM commissions
      WHERE reference_type = 'visites'
        AND reference_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Pas de nouvelle génération lors d'une simple modification d'une VT déjà validée.
  IF TG_OP = 'UPDATE' AND OLD.statut = 'terminee' THEN
    RETURN NEW;
  END IF;

  -- Le commercial est celui rattaché au prospect de la VT.
  SELECT p.commercial_id
    INTO v_commercial_id
  FROM prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_commercial_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Le produit ciblé des VT est un identifiant métier de la visite et ne doit
  -- pas être assimilé automatiquement à catalogue_produits.id.
  -- Le barème VT est donc sélectionné par type + commercial + dates/priorité.
  SELECT *
    INTO r
  FROM fn_commission_rule(
    'vt',
    v_commercial_id,
    NULL,
    COALESCE(NEW.date_visite, current_date)
  );

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  m_commercial := COALESCE(r.montant_commercial, 0);
  m_societe := COALESCE(r.montant_societe, 0);

  INSERT INTO commissions (
    commercial_id,
    type,
    libelle,
    reference_type,
    reference_id,
    montant_commercial,
    montant_societe,
    statut
  )
  VALUES (
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
    montant_commercial = EXCLUDED.montant_commercial,
    montant_societe = EXCLUDED.montant_societe,
    libelle = EXCLUDED.libelle;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_vt_validation ON visites;
CREATE TRIGGER trg_sync_commission_vt_validation
  AFTER INSERT OR UPDATE OF statut
  ON visites
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_commission_vt_validation();

-- Rattrapage des VT déjà validées avant cette migration.
INSERT INTO commissions (
  commercial_id,
  type,
  libelle,
  reference_type,
  reference_id,
  montant_commercial,
  montant_societe,
  statut
)
SELECT
  p.commercial_id,
  'vt',
  'Visite technique — ' || v.id::text,
  'visites',
  v.id,
  COALESCE(r.montant_commercial, 0),
  COALESCE(r.montant_societe, 0),
  'en_attente'
FROM visites v
JOIN prospects p ON p.id = v.prospect_id
CROSS JOIN LATERAL (
  SELECT *
  FROM fn_commission_rule('vt', p.commercial_id, NULL, COALESCE(v.date_visite, current_date))
) r
WHERE v.statut = 'terminee'
  AND p.commercial_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM commissions c
    WHERE c.reference_type = 'visites'
      AND c.reference_id = v.id
  )
ON CONFLICT (reference_type, reference_id) DO NOTHING;
