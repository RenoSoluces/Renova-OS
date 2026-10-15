
CREATE OR REPLACE FUNCTION fn_sync_commission_devis_signe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r commission_bareme%ROWTYPE;
  v_com uuid;
  v_prod uuid;
  v_quantite numeric;
  v_base numeric;
  v_base_pourcentage numeric := 0;
  v_m_com numeric := 0;
  v_m_soc numeric := 0;
  v_pourcentage numeric := 0;
  v_pourcentage_calcule boolean := false;
  v_ligne record;
BEGIN
  IF NEW.statut <> 'signe' THEN
    RETURN NEW;
  END IF;

  SELECT p.commercial_id
  INTO v_com
  FROM prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_com IS NULL THEN
    RETURN NEW;
  END IF;

  v_base_pourcentage := CASE
    WHEN NEW.reste_a_charge IS NULL THEN 0
    ELSE COALESCE(NEW.reste_a_charge, 0)
  END;

  -- Le pourcentage est calculé une seule fois sur le devis.
  -- Les montants fixes sont additionnés selon les quantités des lignes.
  FOR v_ligne IN
    SELECT dl.produit_id, COALESCE(dl.quantite, 1) AS quantite
    FROM devis_lignes dl
    WHERE dl.devis_id = NEW.id
      AND dl.produit_id IS NOT NULL
    ORDER BY dl.ordre
  LOOP
    SELECT *
    INTO r
    FROM fn_commission_rule(
      'devis_signe',
      v_com,
      v_ligne.produit_id,
      COALESCE(NEW.date_creation::date, current_date)
    );

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_quantite := GREATEST(COALESCE(v_ligne.quantite, 1), 0);

    -- Une unité vendue génère une commission fixe par unité,
    -- y compris lorsque le barème est en mode "fixe".
    v_m_com := v_m_com
      + COALESCE(r.montant_commercial, 0) * v_quantite;

    v_m_soc := v_m_soc
      + COALESCE(r.montant_societe, 0) * v_quantite;

    -- Le pourcentage ne doit pas être appliqué plusieurs fois
    -- au montant total du devis lorsqu'il comporte plusieurs lignes.
    IF NOT v_pourcentage_calcule
       AND COALESCE(r.pourcentage_commercial, 0) <> 0 THEN
      v_base := CASE r.base_pourcentage
        WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
        WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
        ELSE COALESCE(NEW.montant_ht, 0)
      END;

      v_pourcentage := COALESCE(r.pourcentage_commercial, 0)
        / 100 * v_base;

      v_pourcentage_calcule := true;
    END IF;
  END LOOP;

  v_m_com := v_m_com + v_pourcentage;

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
    v_com,
    'devis_signe',
    'Devis signé — ' || COALESCE(NEW.numero, ''),
    'devis',
    NEW.id,
    v_m_com,
    v_m_soc,
    'en_attente'
  )
  ON CONFLICT (reference_type, reference_id)
  DO UPDATE SET
    commercial_id = EXCLUDED.commercial_id,
    montant_commercial = EXCLUDED.montant_commercial,
    montant_societe = EXCLUDED.montant_societe;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON devis;

CREATE TRIGGER trg_sync_commission_devis_signe
AFTER INSERT OR UPDATE OF statut ON devis
FOR EACH ROW
EXECUTE FUNCTION fn_sync_commission_devis_signe();
