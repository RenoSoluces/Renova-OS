-- Règles de commission par type/variante de produit, lecture seule apporteurs.
ALTER TABLE public.commission_bareme
  ADD COLUMN IF NOT EXISTS categorie_produit text,
  ADD COLUMN IF NOT EXISTS variante_produit text;

CREATE OR REPLACE FUNCTION public.fn_commission_product_variant(p_produit uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE cp.categorie
    WHEN 'pac_air_air' THEN
      CASE WHEN COALESCE(cp.caracteristiques->>'puissance_froid_kw', cp.caracteristiques->>'puissance') ~ '^[0-9]+([.][0-9]+)?$'
        THEN trim_scale(COALESCE(cp.caracteristiques->>'puissance_froid_kw', cp.caracteristiques->>'puissance')::numeric)::text
        ELSE NULL END
    WHEN 'photovoltaique' THEN
      CASE WHEN COALESCE(cp.caracteristiques->>'puissance_kwc', cp.caracteristiques->>'puissance_pv_kWc') ~ '^[0-9]+([.][0-9]+)?$'
        THEN trim_scale(COALESCE(cp.caracteristiques->>'puissance_kwc', cp.caracteristiques->>'puissance_pv_kWc')::numeric)::text
        ELSE NULL END
    WHEN 'batterie_stockage' THEN
      CASE
        WHEN cp.nom ILIKE '%additionnelle%' THEN 'additionnelle_5.12'
        WHEN COALESCE(cp.caracteristiques->>'capacite_stockage_kWh', cp.caracteristiques->>'capacite_kWh') ~ '^[0-9]+([.][0-9]+)?$'
          THEN trim_scale(COALESCE(cp.caracteristiques->>'capacite_stockage_kWh', cp.caracteristiques->>'capacite_kWh')::numeric)::text
            || '_' ||
            CASE
              WHEN lower(COALESCE(cp.caracteristiques->>'phase', cp.nom, '')) LIKE '%triphas%' THEN 'triphase'
              WHEN lower(COALESCE(cp.caracteristiques->>'phase', cp.nom, '')) LIKE '%monophas%' THEN 'monophase'
              ELSE 'inconnu'
            END
        ELSE NULL
      END
    ELSE NULL
  END
  FROM public.catalogue_produits cp
  WHERE cp.id = p_produit;
$function$


CREATE OR REPLACE FUNCTION public.fn_commission_rule(p_type text, p_commercial uuid, p_produit uuid, p_date date)
 RETURNS commission_bareme
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT cb.*
  FROM public.commission_bareme cb
  LEFT JOIN public.catalogue_produits cp ON cp.id = p_produit
  WHERE cb.type = p_type
    AND cb.actif = true
    AND (cb.date_debut IS NULL OR cb.date_debut <= p_date)
    AND (cb.date_fin IS NULL OR cb.date_fin >= p_date)
    AND (cb.commercial_id IS NULL OR cb.commercial_id = p_commercial)
    AND (cb.produit_id IS NULL OR cb.produit_id = p_produit)
    AND (cb.categorie_produit IS NULL OR cb.categorie_produit = cp.categorie)
    AND (cb.variante_produit IS NULL OR cb.variante_produit = public.fn_commission_product_variant(p_produit))
    AND (
      cb.public_cible = 'tous'
      OR cb.public_cible = COALESCE(cp.public_cible, 'particulier')
    )
  ORDER BY
    ((cb.commercial_id IS NOT NULL)::int * 8
     + (cb.produit_id IS NOT NULL)::int * 4
     + (cb.variante_produit IS NOT NULL)::int * 2
     + (cb.categorie_produit IS NOT NULL)::int
     + (cb.public_cible <> 'tous')::int) DESC,
    cb.priorite DESC NULLS LAST,
    cb.created_at DESC
  LIMIT 1
$function$


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

    SELECT * INTO r
    FROM public.fn_commission_rule(
      'devis_signe', v_com, v_ligne.produit_id,
      COALESCE(NEW.date_creation::date, CURRENT_DATE)
    );
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Les règles génériques/type sont appliquées une fois par type de produit,
    -- tandis qu'une règle attachée à un produit reste calculée par ligne/quantité.
    IF r.produit_id IS NULL THEN
      v_rule_key := COALESCE(r.categorie_produit, '*') || '|' || COALESCE(r.variante_produit, '*');
      IF v_rule_key = '*|*' THEN v_rule_key := '__generic__'; END IF;
      IF v_rule_key = ANY(v_generic_keys) THEN CONTINUE; END IF;
      v_generic_keys := array_append(v_generic_keys, v_rule_key);
    END IF;

    IF r.mode <> 'pourcentage' THEN
      IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' THEN
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0) * v_quantite;
      ELSE
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0);
      END IF;
    END IF;

    IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' THEN
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
$function$



DROP POLICY IF EXISTS commission_bareme_select_admin ON public.commission_bareme;
CREATE POLICY commission_bareme_select_admin ON public.commission_bareme
FOR SELECT TO authenticated USING (public.is_admin_ou_manager());

CREATE OR REPLACE VIEW public.commission_bareme_apporteurs AS
SELECT cb.id, cb.type, cb.libelle, cb.montant_commercial,
       cb.pourcentage_commercial, cb.actif, cb.commercial_id, cb.produit_id,
       cb.mode, cb.base_pourcentage, cb.priorite, cb.date_debut, cb.date_fin,
       cb.public_cible, cb.categorie_produit, cb.variante_produit, cb.created_at
FROM public.commission_bareme cb
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role IN ('apporteur','partner')
)
AND (cb.commercial_id IS NULL OR cb.commercial_id = (SELECT auth.uid()));

REVOKE ALL ON public.commission_bareme_apporteurs FROM PUBLIC, anon;
GRANT SELECT ON public.commission_bareme_apporteurs TO authenticated;


-- Barème Octobre 2026 : règles rattachées à Mickael BRAHIMI et définies par type/variante.
DO $seed$
DECLARE
  v_brahimi uuid := '288a684c-e306-46b4-9040-2e36e4ea462f';
  v_variant text;
  v_amount numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.commission_bareme WHERE commercial_id=v_brahimi AND type='devis_signe' AND categorie_produit='pac_air_eau' AND variante_produit IS NULL AND public_cible='particulier' AND actif) THEN
    INSERT INTO public.commission_bareme(type,libelle,montant_commercial,montant_societe,pourcentage_commercial,actif,commercial_id,mode,base_pourcentage,priorite,public_cible,categorie_produit)
    VALUES('devis_signe','PAC Air/Eau — Particuliers · grille octobre 2026',1000,0,NULL,true,v_brahimi,'fixe','montant_ht',100,'particulier','pac_air_eau');
  END IF;

  FOR v_variant, v_amount IN SELECT * FROM (VALUES ('2',347::numeric),('2.5',371::numeric),('3.5',567::numeric),('5',601::numeric)) AS v(variant,amount)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.commission_bareme WHERE commercial_id=v_brahimi AND type='devis_signe' AND categorie_produit='pac_air_air' AND variante_produit=v_variant AND public_cible='particulier' AND actif) THEN
      INSERT INTO public.commission_bareme(type,libelle,montant_commercial,montant_societe,pourcentage_commercial,actif,commercial_id,mode,base_pourcentage,priorite,public_cible,categorie_produit,variante_produit)
      VALUES('devis_signe','PAC Air/Air '||v_variant||' kW — grille octobre 2026',v_amount,0,NULL,true,v_brahimi,'fixe','montant_ht',100,'particulier','pac_air_air',v_variant);
    END IF;
  END LOOP;

  FOR v_variant, v_amount IN SELECT * FROM (VALUES
    ('1',804.55::numeric),('2',1350::numeric),('2.5',1445.45::numeric),('3',1622.73::numeric),
    ('4',1987.50::numeric),('5',2237.50::numeric),('6',2487.50::numeric),('7',2737.50::numeric),
    ('8',3062.50::numeric),('9',3400::numeric),('10',3937.50::numeric),('11',4362.50::numeric),
    ('12',4737.50::numeric),('18',6875::numeric)
  ) AS v(variant,amount)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.commission_bareme WHERE commercial_id=v_brahimi AND type='devis_signe' AND categorie_produit='photovoltaique' AND variante_produit=v_variant AND public_cible='particulier' AND actif) THEN
      INSERT INTO public.commission_bareme(type,libelle,montant_commercial,montant_societe,pourcentage_commercial,actif,commercial_id,mode,base_pourcentage,priorite,public_cible,categorie_produit,variante_produit)
      VALUES('devis_signe','Photovoltaïque '||v_variant||' kWc — grille octobre 2026',v_amount,0,NULL,true,v_brahimi,'fixe','montant_ht',100,'particulier','photovoltaique',v_variant);
    END IF;
  END LOOP;

  FOR v_variant, v_amount IN SELECT * FROM (VALUES
    ('5.12_monophase',1622.73::numeric),('10.24_monophase',1895.45::numeric),
    ('10.24_triphase',2168.18::numeric),('additionnelle_5.12',668.18::numeric)
  ) AS v(variant,amount)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.commission_bareme WHERE commercial_id=v_brahimi AND type='devis_signe' AND categorie_produit='batterie_stockage' AND variante_produit=v_variant AND public_cible='particulier' AND actif) THEN
      INSERT INTO public.commission_bareme(type,libelle,montant_commercial,montant_societe,pourcentage_commercial,actif,commercial_id,mode,base_pourcentage,priorite,public_cible,categorie_produit,variante_produit)
      VALUES('devis_signe','Batterie '||replace(v_variant,'_',' ')||' — grille octobre 2026',v_amount,0,NULL,true,v_brahimi,'fixe','montant_ht',100,'particulier','batterie_stockage',v_variant);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.commission_bareme WHERE commercial_id=v_brahimi AND type='devis_signe' AND categorie_produit IS NULL AND variante_produit IS NULL AND public_cible='professionnel' AND COALESCE(pourcentage_commercial,0)=5 AND actif) THEN
    INSERT INTO public.commission_bareme(type,libelle,montant_commercial,montant_societe,pourcentage_commercial,actif,commercial_id,mode,base_pourcentage,priorite,public_cible)
    VALUES('devis_signe','Professionnels — 5 % du HT — grille octobre 2026',0,0,5,true,v_brahimi,'pourcentage','montant_ht',100,'professionnel');
  END IF;
END
$seed$;
