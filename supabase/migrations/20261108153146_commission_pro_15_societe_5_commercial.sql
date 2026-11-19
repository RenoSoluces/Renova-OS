ALTER TABLE public.commission_bareme ADD COLUMN IF NOT EXISTS pourcentage_societe numeric;

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
  v_pourcentage_soc numeric := 0;
  v_pourcentage_soc_calcule boolean := false;
  v_generic_keys text[] := ARRAY[]::text[];
  v_rule_key text;
  v_has_line boolean := false;
  v_ssc_panneaux integer := 0;
  v_ssc_avec_pac boolean := false;
  v_ssc_forfait boolean := false;
  v_ssc_option text;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'signe' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'signe' THEN RETURN NEW; END IF;

  SELECT p.commercial_id INTO v_com
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;
  IF v_com IS NULL THEN RETURN NEW; END IF;

  v_ssc_panneaux := public.ssc_panneaux_devis(NEW.id);
  IF v_ssc_panneaux > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.devis_lignes dl JOIN public.catalogue_produits cp ON cp.id = dl.produit_id
      WHERE dl.devis_id = NEW.id AND cp.categorie = 'pac_air_eau'
    ) INTO v_ssc_avec_pac;

    SELECT (CASE WHEN v_ssc_avec_pac THEN 'pac_' ELSE 'seul_' END) || COALESCE(pr.regime_aide_commission, '?')
           || '_' || COALESCE(pr.zone_climatique, '?')
      INTO v_ssc_option
      FROM public.prospects pr WHERE pr.id = NEW.prospect_id;

    SELECT cb.* INTO r
    FROM public.commission_bareme cb
    WHERE cb.type = 'devis_signe' AND cb.actif
      AND cb.commercial_id = v_com
      AND cb.categorie_produit = 'solaire_thermique'
      AND cb.public_cible = 'particulier'
      AND cb.variante_produit = v_ssc_option
      AND v_ssc_panneaux BETWEEN COALESCE(cb.panneaux_min, 0) AND COALESCE(cb.panneaux_max, 9999)
      AND (cb.date_debut IS NULL OR cb.date_debut <= COALESCE(NEW.date_creation::date, CURRENT_DATE))
      AND (cb.date_fin IS NULL OR cb.date_fin >= COALESCE(NEW.date_creation::date, CURRENT_DATE))
    ORDER BY cb.priorite DESC NULLS LAST, cb.created_at DESC
    LIMIT 1;
    IF FOUND THEN
      v_ssc_forfait := true;
      v_m_com := v_m_com + COALESCE(r.montant_commercial, 0);
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0);
    END IF;
  END IF;

  FOR v_ligne IN
    SELECT dl.produit_id, GREATEST(COALESCE(dl.quantite, 1), 0) AS quantite, cp.categorie, cp.nom, cp.caracteristiques
    FROM public.devis_lignes dl
    LEFT JOIN public.catalogue_produits cp ON cp.id = dl.produit_id
    WHERE dl.devis_id = NEW.id AND dl.produit_id IS NOT NULL
    ORDER BY dl.ordre, dl.id
  LOOP
    v_has_line := true;
    v_quantite := v_ligne.quantite;

    IF public.ssc_panneaux_produit(v_ligne.nom, v_ligne.caracteristiques, v_ligne.categorie) > 0 THEN
      CONTINUE;
    END IF;
    IF v_ssc_forfait AND v_ligne.categorie = 'pac_air_eau' THEN
      CONTINUE;
    END IF;

    IF v_ligne.categorie = 'combles_perdus' THEN
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

    -- Part société en pourcentage (produits pros : 15 % du HT), calculée une seule fois par devis.
    IF NOT v_pourcentage_soc_calcule AND COALESCE(r.pourcentage_societe, 0) <> 0 THEN
      v_base := CASE r.base_pourcentage
        WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
        WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
        ELSE COALESCE(NEW.montant_ht, 0)
      END;
      v_pourcentage_soc := COALESCE(r.pourcentage_societe, 0) / 100 * v_base;
      v_pourcentage_soc_calcule := true;
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(
    CASE lower(COALESCE(cp.caracteristiques->>'configuration', ''))
      WHEN 'bi-split' THEN 12.50 * GREATEST(COALESCE(dl.quantite, 1), 0)
      WHEN 'tri-split' THEN 20.00 * GREATEST(COALESCE(dl.quantite, 1), 0)
      ELSE 0
    END
  ), 0)
  INTO v_base
  FROM public.devis_lignes dl
  JOIN public.catalogue_produits cp ON cp.id = dl.produit_id
  WHERE dl.devis_id = NEW.id
    AND cp.categorie = 'pac_air_air'
    AND lower(COALESCE(cp.caracteristiques->>'type_element', '')) = 'groupe_exterieur'
    AND lower(COALESCE(cp.caracteristiques->>'configuration', '')) IN ('bi-split', 'tri-split');
  v_m_com := v_m_com + v_base;

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
  v_m_soc := ROUND(v_m_soc + v_pourcentage_soc, 2);

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

INSERT INTO public.commission_bareme
  (type, libelle, montant_commercial, montant_societe, pourcentage_commercial, pourcentage_societe, actif, commercial_id, mode, base_pourcentage, priorite, public_cible, categorie_produit)
SELECT 'devis_signe', c.libelle, 0, 0, 5, 15, true, p.id, 'pourcentage', 'montant_ht', 110, 'professionnel', c.categorie
FROM (VALUES
  ('destratificateur', 'Pro — déstratificateur — 15 % société / 5 % commercial du HT'),
  ('hp_flottante', 'Pro — HP flottante — 15 % société / 5 % commercial du HT'),
  ('isolation_toiture_pro', 'Pro — toiture plate — 15 % société / 5 % commercial du HT'),
  ('pac_air_eau', 'Pro — PAC air-eau — 15 % société / 5 % commercial du HT')
) AS c(categorie, libelle)
CROSS JOIN (VALUES
  ('288a684c-e306-46b4-9040-2e36e4ea462f'::uuid),
  ('5e498d08-35aa-4f5e-8721-3d4a12018fee'::uuid),
  ('ebc7f814-329b-45d9-a6e8-8e9610f01bd3'::uuid),
  ('dc10db0d-48cd-45f8-89e1-61fb236003c1'::uuid)
) AS p(id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.commission_bareme b
  WHERE b.commercial_id = p.id AND b.categorie_produit = c.categorie AND b.public_cible = 'professionnel' AND b.pourcentage_societe IS NOT NULL
);
