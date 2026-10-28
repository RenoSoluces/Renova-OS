-- Grille partenaire solaire thermique (SSC, fiche BAR-TH-168) — commission régie HT.
-- Trois options : PAC air/eau + SSC avec MaPrimeRénov', PAC air/eau + SSC 100 % CEE,
-- SSC seul (sans PAC, 100 % CEE). Zones H1 et H2 uniquement, par tranche de panneaux.
-- montant_societe = commission versée par le partenaire ; montant_commercial = part du
-- commercial (25 % de la commission régie, comme la grille précédente).

alter table public.commission_bareme add column if not exists panneaux_min integer;
alter table public.commission_bareme add column if not exists panneaux_max integer;

-- Toutes les règles passent en priorité 100.
update public.commission_bareme set priorite = 100, updated_at = now() where priorite is distinct from 100;

-- L'ancienne grille par kit (12 / 16 / 20 panneaux, zones H1 à H3) est remplacée.
update public.commission_bareme
   set actif = false, updated_at = now()
 where categorie_produit = 'solaire_thermique' and type = 'devis_signe' and actif
   and variante_produit ~ '^H[123]_(12|16|20)_(mpr|full)_cee$';

do $seed$
declare
  v_com uuid;
  v record;
begin
  -- La grille s'applique à chaque commercial qui avait une grille solaire thermique.
  for v_com in select distinct commercial_id from public.commission_bareme
                where categorie_produit = 'solaire_thermique' and commercial_id is not null loop
    for v in select * from (values
    ('PAC A/E + SSC avec MPR · H1 · 14 à 15 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H1',14,15,1000.0,4000),
    ('PAC A/E + SSC avec MPR · H2 · 14 à 15 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H2',14,15,875.0,3500),
    ('PAC A/E + SSC avec MPR · H1 · 16 à 19 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H1',16,19,1375.0,5500),
    ('PAC A/E + SSC avec MPR · H2 · 16 à 19 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H2',16,19,1250.0,5000),
    ('PAC A/E + SSC avec MPR · H1 · 20 à 24 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H1',20,24,1750.0,7500),
    ('PAC A/E + SSC avec MPR · H2 · 20 à 24 panneaux — grille partenaire BAR-TH-168','pac_mpr_cee_H2',20,24,1625.0,6500),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H1 · 14 à 15 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H1',14,15,500.0,2000),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H2 · 14 à 15 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H2',14,15,375.0,1500),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H1 · 16 à 19 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H1',16,19,875.0,3500),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H2 · 16 à 19 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H2',16,19,750.0,3000),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H1 · 20 à 24 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H1',20,24,1250.0,5000),
    ('PAC A/E + SSC sans MPR (100 % CEE) · H2 · 20 à 24 panneaux — grille partenaire BAR-TH-168','pac_full_cee_H2',20,24,1125.0,4500),
    ('SSC seul sans PAC (100 % CEE) · H1 · 8 à 11 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H1',8,11,250.0,1000),
    ('SSC seul sans PAC (100 % CEE) · H1 · 12 à 15 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H1',12,15,625.0,2500),
    ('SSC seul sans PAC (100 % CEE) · H2 · 12 à 15 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H2',12,15,375.0,1500),
    ('SSC seul sans PAC (100 % CEE) · H1 · 16 à 19 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H1',16,19,875.0,3500),
    ('SSC seul sans PAC (100 % CEE) · H2 · 16 à 19 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H2',16,19,625.0,2500),
    ('SSC seul sans PAC (100 % CEE) · H1 · 20 à 23 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H1',20,23,1125.0,4500),
    ('SSC seul sans PAC (100 % CEE) · H2 · 20 à 23 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H2',20,23,875.0,3500),
    ('SSC seul sans PAC (100 % CEE) · H1 · 24 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H1',24,24,1625.0,6500),
    ('SSC seul sans PAC (100 % CEE) · H2 · 24 panneaux — grille partenaire BAR-TH-168','seul_full_cee_H2',24,24,1375.0,5500)
    ) as x(libelle, variante, pmin, pmax, m_com, m_soc) loop
      if not exists (select 1 from public.commission_bareme
                      where commercial_id = v_com and categorie_produit = 'solaire_thermique'
                        and variante_produit = v.variante and panneaux_min = v.pmin and panneaux_max = v.pmax and actif) then
        insert into public.commission_bareme (type, libelle, montant_commercial, montant_societe, pourcentage_commercial, actif,
          commercial_id, mode, base_pourcentage, priorite, public_cible, categorie_produit, variante_produit, panneaux_min, panneaux_max)
        values ('devis_signe', v.libelle, v.m_com, v.m_soc, null, true, v_com, 'fixe', 'montant_ht', 100, 'particulier',
          'solaire_thermique', v.variante, v.pmin, v.pmax);
      end if;
    end loop;
  end loop;
end
$seed$;

-- Capteurs solaires d'un SSC BAR-TH-168 : produits « 16 Panneaux Solaires Thermiques »,
-- ou produits de la fiche dont le catalogue indique le nombre de capteurs.
-- Les ballons seuls ne comptent pas comme des panneaux.
create or replace function public.ssc_panneaux_produit(p_nom text, p_caracteristiques jsonb, p_categorie text)
returns integer
language sql immutable set search_path to 'public' as $$
  select case
    when p_categorie is distinct from 'solaire_thermique' then 0
    when p_nom ~* '^\s*\d+\s+panneaux solaires thermiques' then (regexp_match(p_nom, '^\s*(\d+)'))[1]::int
    when p_caracteristiques->>'fiche_cee' = 'BAR-TH-168'
         and nullif(regexp_replace(coalesce(p_caracteristiques->>'nombre_capteurs', ''), '\D', '', 'g'), '') is not null
      then regexp_replace(p_caracteristiques->>'nombre_capteurs', '\D', '', 'g')::int
    else 0
  end;
$$;

create or replace function public.ssc_panneaux_devis(p_devis_id uuid)
returns integer
language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(public.ssc_panneaux_produit(cp.nom, cp.caracteristiques, cp.categorie)
                      * greatest(coalesce(dl.quantite, 1), 0)), 0)::int
    from public.devis_lignes dl
    join public.catalogue_produits cp on cp.id = dl.produit_id
   where dl.devis_id = p_devis_id;
$$;

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

  -- Solaire thermique BAR-TH-168 : commission par ensemble (PAC A/E + SSC avec MPR,
  -- PAC A/E + SSC 100 % CEE, SSC seul 100 % CEE), selon la zone et le nombre total de
  -- panneaux. Hors grille (zone H3, tranche absente, régime inconnu) : pas de commission SSC.
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

    -- Les panneaux BAR-TH-168 sont rémunérés par l'ensemble ci-dessus ; la PAC air/eau
    -- d'un ensemble PAC + SSC est comprise dans la commission de l'ensemble.
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

  -- Add the explicit multi-split uplift once per outdoor unit, in addition
  -- to the base Air/Air rate when a matching power bracket exists.
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
