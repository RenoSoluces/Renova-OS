-- Fix composite selection in the contextual commission calculation.
CREATE OR REPLACE FUNCTION public.fn_sync_commission_devis_signe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.commission_bareme%ROWTYPE;
  v_com uuid;
  v_ligne record;
  v_quantite numeric;
  v_base numeric := 0;
  v_m_com numeric := 0;
  v_m_soc numeric := 0;
  v_pourcentage numeric := 0;
  v_pourcentage_calcule boolean := false;
  v_generic_keys text[] := ARRAY[]::text[];
  v_rule_key text;
  v_has_line boolean := false;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'signe' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'signe' THEN RETURN NEW; END IF;

  SELECT p.commercial_id INTO v_com
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;
  IF v_com IS NULL THEN RETURN NEW; END IF;

  FOR v_ligne IN
    SELECT dl.produit_id, GREATEST(COALESCE(dl.quantite, 1), 0) AS quantite
    FROM public.devis_lignes dl
    WHERE dl.devis_id = NEW.id AND dl.produit_id IS NOT NULL
    ORDER BY dl.ordre, dl.id
  LOOP
    v_has_line := true;
    v_quantite := v_ligne.quantite;

    -- Rules with contextual eligibility must use the prospect's declared climate
    -- zone / aid route; never silently fall back to an unqualified generic rate.
    IF EXISTS (
      SELECT 1 FROM public.catalogue_produits cp
      WHERE cp.id = v_ligne.produit_id AND cp.categorie = 'solaire_thermique'
        AND cp.nom ~* '^(12|16|20) panneaux solaires thermiques'
    ) THEN
      SELECT cb.* INTO r
      FROM public.commission_bareme cb
      JOIN public.catalogue_produits cp ON cp.id = v_ligne.produit_id
      JOIN public.prospects pr ON pr.id = NEW.prospect_id
      WHERE cb.type = 'devis_signe' AND cb.actif
        AND cb.commercial_id = v_com
        AND cb.categorie_produit = 'solaire_thermique'
        AND cb.public_cible = 'particulier'
        AND cb.variante_produit =
          COALESCE(pr.zone_climatique, '') || '_' ||
          (regexp_match(cp.nom, '^(12|16|20)'))[1] || '_' ||
          COALESCE(pr.regime_aide_commission, '')
        AND (cb.date_debut IS NULL OR cb.date_debut <= COALESCE(NEW.date_creation::date, CURRENT_DATE))
        AND (cb.date_fin IS NULL OR cb.date_fin >= COALESCE(NEW.date_creation::date, CURRENT_DATE))
      ORDER BY cb.priorite DESC NULLS LAST, cb.created_at DESC
      LIMIT 1;
      IF NOT FOUND THEN CONTINUE; END IF;
    ELSIF EXISTS (
      SELECT 1 FROM public.catalogue_produits cp
      WHERE cp.id = v_ligne.produit_id AND cp.categorie = 'combles_perdus'
    ) THEN
      SELECT cb.* INTO r
      FROM public.commission_bareme cb
      JOIN public.prospects pr ON pr.id = NEW.prospect_id
      WHERE cb.type = 'devis_signe' AND cb.actif
        AND cb.commercial_id = v_com
        AND cb.categorie_produit = 'combles_perdus'
        AND cb.public_cible = 'particulier'
        AND cb.variante_produit = CASE
          WHEN pr.zone_climatique = 'H1' AND lower(COALESCE(pr.categorie_mpr, '')) IN ('tresmodeste','trèsmodeste','bleu') THEN 'H1_bleu'
          WHEN pr.zone_climatique = 'H1' THEN 'H1_autres'
          WHEN pr.zone_climatique = 'H2' AND lower(COALESCE(pr.categorie_mpr, '')) IN ('tresmodeste','trèsmodeste','bleu') THEN 'H2_bleu'
          ELSE '__non_eligible__'
        END
        AND (cb.date_debut IS NULL OR cb.date_debut <= COALESCE(NEW.date_creation::date, CURRENT_DATE))
        AND (cb.date_fin IS NULL OR cb.date_fin >= COALESCE(NEW.date_creation::date, CURRENT_DATE))
      ORDER BY cb.priorite DESC NULLS LAST, cb.created_at DESC
      LIMIT 1;
      IF NOT FOUND THEN CONTINUE; END IF;
    ELSE
      SELECT * INTO r
      FROM public.fn_commission_rule(
        'devis_signe', v_com, v_ligne.produit_id,
        COALESCE(NEW.date_creation::date, CURRENT_DATE)
      );
      IF NOT FOUND THEN CONTINUE; END IF;
    END IF;

    -- Les règles sans variante rémunèrent le type de produit une seule fois.
    -- Une règle avec variante est liée à une configuration (ex. PAC Air/Air 2 kW)
    -- et doit compter chaque unité effectivement présente dans le devis.
    IF r.produit_id IS NULL AND r.variante_produit IS NULL THEN
      v_rule_key := COALESCE(r.categorie_produit, '*') || '|*';
      IF v_rule_key = '*|*' THEN v_rule_key := '__generic__'; END IF;
      IF v_rule_key = ANY(v_generic_keys) THEN CONTINUE; END IF;
      v_generic_keys := array_append(v_generic_keys, v_rule_key);
    END IF;

    IF r.mode <> 'pourcentage' THEN
      IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' OR r.variante_produit IS NOT NULL THEN
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0) * v_quantite;
      ELSE
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0);
      END IF;
    END IF;

    IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' OR r.variante_produit IS NOT NULL THEN
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0) * v_quantite;
    ELSE
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0);
    END IF;

    IF NOT v_pourcentage_calcule AND COALESCE(r.pourcentage_commercial, 0) <> 0 THEN
      v_base := CASE r.base_pourcentage
        WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
        WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
        ELSE COALESCE(NEW.montant_ht, 0)
      END;
      v_pourcentage := COALESCE(r.pourcentage_commercial, 0) / 100 * v_base;
      v_pourcentage_calcule := true;
    END IF;
  END LOOP;

  IF NOT v_has_line THEN
    SELECT * INTO r
    FROM public.fn_commission_rule('devis_signe', v_com, NULL, COALESCE(NEW.date_creation::date, CURRENT_DATE));
    IF FOUND THEN
      IF r.mode <> 'pourcentage' THEN v_m_com := v_m_com + COALESCE(r.montant_commercial, 0); END IF;
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0);
      IF COALESCE(r.pourcentage_commercial, 0) <> 0 THEN
        v_base := CASE r.base_pourcentage
          WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
          WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
          ELSE COALESCE(NEW.montant_ht, 0)
        END;
        v_pourcentage := COALESCE(r.pourcentage_commercial, 0) / 100 * v_base;
      END IF;
    END IF;
  END IF;

  v_m_com := ROUND(v_m_com + v_pourcentage, 2);
  v_m_soc := ROUND(v_m_soc, 2);

  INSERT INTO public.commissions AS current_commission (
    commercial_id, type, libelle, reference_type, reference_id,
    montant_commercial, montant_societe, statut
  )
  VALUES (
    v_com, 'devis_signe', 'Devis signé — ' || COALESCE(NEW.numero, ''),
    'devis', NEW.id, v_m_com, v_m_soc, 'en_attente'
  )
  ON CONFLICT (reference_type, reference_id)
  DO UPDATE SET
    commercial_id = EXCLUDED.commercial_id,
    libelle = EXCLUDED.libelle,
    montant_commercial = EXCLUDED.montant_commercial,
    montant_societe = EXCLUDED.montant_societe
  WHERE current_commission.statut = 'en_attente'
    AND current_commission.date_paiement_commercial IS NULL
    AND current_commission.date_paiement_societe IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.commission_echeances ce WHERE ce.commission_id = current_commission.id)
    AND NOT EXISTS (SELECT 1 FROM public.commission_ajustements ca WHERE ca.commission_id = current_commission.id);

  RETURN NEW;
END;
$function$;
