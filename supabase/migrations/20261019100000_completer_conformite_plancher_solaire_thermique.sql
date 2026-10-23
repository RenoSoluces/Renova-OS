-- Renova OS — enrichissement conformité isolation plancher bas et solaire thermique
-- Préparé le 19/10/2026 à partir des tarifs communiqués par Reno Soluces.
-- Les montants de primes sont des repères indicatifs : les montants réels dépendent
-- du dossier, de l'obligé/délégataire et des règles applicables à la date d'engagement.
-- Les forfaits de pose sont des lignes séparées au m² : ne pas les ajouter aux produits
-- dont le prix est déjà déclaré « pose incluse ».

BEGIN;

-- Les familles d'isolation concernées utilisent la fiche CEE officielle correspondante.
-- On conserve les données techniques existantes et on ajoute les métadonnées manquantes.
UPDATE public.catalogue_produits
SET fiche_cee = 'BAR-EN-101',
    eligible_cee = true,
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) ||
      jsonb_build_object(
        'fiche_cee', 'BAR-EN-101',
        'condition_cee', CASE
          WHEN categorie = 'combles_perdus' THEN 'Résistance thermique R ≥ 7 m²·K/W à justifier pour l’isolation des combles perdus.'
          ELSE 'Résistance thermique R ≥ 6 m²·K/W à justifier pour l’isolation des rampants.'
        END,
        'conformite_a_verifier', true
      )
WHERE categorie IN ('combles_perdus','rampants');

UPDATE public.catalogue_produits
SET fiche_cee = 'BAR-EN-102',
    eligible_cee = true,
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) ||
      jsonb_build_object(
        'fiche_cee', 'BAR-EN-102',
        'condition_cee', 'Éligibilité sous réserve des critères de la fiche BAR-EN-102, de la résistance thermique requise et de la conformité du système complet.',
        'conformite_a_verifier', true
      )
WHERE categorie = 'ite' AND COALESCE(reference,'') NOT IN ('FAC_ECHAFAUDAGE','FAC_ENDUIT');

-- Les lignes d'échafaudage et d'enduit sont des prestations annexes, pas des isolants CEE.
UPDATE public.catalogue_produits
SET fiche_cee = '', eligible_cee = false,
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) ||
      jsonb_build_object('surface_eligible_cee', false, 'note_cee', 'Prestation annexe : ne pas inclure dans la surface d’isolant éligible.')
WHERE categorie = 'ite' AND reference IN ('FAC_ECHAFAUDAGE','FAC_ENDUIT');

UPDATE public.catalogue_produits
SET fiche_cee = 'BAR-EN-103',
    eligible_cee = true,
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) ||
      jsonb_build_object(
        'fiche_cee', 'BAR-EN-103',
        'condition_cee', 'Résistance thermique R ≥ 3,0 m²·K/W ; renseigner le pare-vapeur et la surface réellement posée.',
        'prime_cee_indicative_eur_m2', jsonb_build_object('bleu',11,'jaune',7,'violet',7,'rose',7),
        'tva_indicative', 5.5,
        'conformite_a_verifier', true
      )
WHERE categorie = 'plancher';

-- Produits plancher bas : fourniture seule, prix HT/m².
DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : catalogue plancher bas non enrichi.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"reference":"EFISOL-TMS-68","nom":"Soprema Efisol TMS — 68 mm (R=3,15)","marque":"Soprema / Efisol","prix":15.70,"r":3.15,"type":"Polyuréthane (PU)"},
    {"reference":"HIRSCH-GRAPHIPAN-CEE103-100","nom":"Hirsch Graphipan CEE 103 Igni — 100 mm (R=3,15)","marque":"Hirsch Isolation","prix":40.00,"r":3.15,"type":"PSE"},
    {"reference":"KNAUF-THANE-SOL-80","nom":"Knauf Thane Sol — 80 mm (R=3,70)","marque":"Knauf","prix":24.50,"r":3.70,"type":"Polyuréthane (PU)"},
    {"reference":"KNAUF-XTHERM-RENO-SE-96","nom":"Knauf XTherm Réno SE — 96 mm (R=3,00)","marque":"Knauf","prix":30.55,"r":3.00,"type":"PSE"},
    {"reference":"SINIAT-UNIMAT-TH32-100","nom":"Siniat Unimat TH32 IGN — 100 mm (R=3,10)","marque":"Siniat","prix":21.35,"r":3.10,"type":"PSE"},
    {"reference":"SINIAT-UNIMAT-TH38-IGN-130","nom":"Siniat Unimat TH38 IGN — 130 mm (R=3,40)","marque":"Siniat","prix":26.00,"r":3.40,"type":"PSE"},
    {"reference":"URSA-RENOSOUDAL-ALU-96","nom":"URSA Renosoudal Alu — 96 mm (R=3,00)","marque":"URSA","prix":40.35,"r":3.00,"type":"Laine de roche / laine minérale"},
    {"reference":"ROCKWOOL-ROCKFEU-THERM-RSD-100","nom":"Rockwool Rockfeu Therm RsD — 100 mm (R=3,00)","marque":"Rockwool","prix":19.19,"r":3.00,"type":"Laine de roche"},
    {"reference":"KNAUF-SOUDALLE-ALU-100","nom":"Knauf Insulation Soudalle Alu — 100 mm (R=3,15)","marque":"Knauf Insulation","prix":31.70,"r":3.15,"type":"Laine minérale"},
    {"reference":"ROCKWOOL-SOUFACE-ALU-102","nom":"Rockwool Souface Alu — 102 mm (R=3,00)","marque":"Rockwool","prix":15.95,"r":3.00,"type":"Laine de roche"},
    {"reference":"KNAUF-TI312-ALU-240-R600","nom":"Knauf Insulation TI 312 Alu — 240 mm (R=6,00)","marque":"Knauf Insulation","prix":17.00,"r":6.00,"type":"Laine minérale"},
    {"reference":"KNAUF-TI312-KRAFT-ALU-120-R300","nom":"Knauf Insulation TI 312 Kraft Alu — 120 mm (R=3,00)","marque":"Knauf Insulation","prix":11.50,"r":3.00,"type":"Laine minérale"}
  ]$products$::jsonb) LOOP
    SELECT id INTO v_id FROM public.catalogue_produits
      WHERE entreprise_id = v_entreprise AND reference = p->>'reference' LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'plancher',p->>'nom',p->>'marque',p->>'reference',
        'Panneau ou isolant pour isolation du plancher bas. Prix indicatif de fourniture seule communiqué par Reno Soluces le 19/10/2026 ; confirmer la fiche fabricant et la référence exacte avant commande.',
        jsonb_build_object('type_isolant',p->>'type','epaisseur_mm',NULL,
          'resistance_thermique_R_m2K_W',(p->>'r')::numeric,
          'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026',
          'prix_fourniture_seule',true,'fiche_cee','BAR-EN-103',
          'condition_cee','R ≥ 3,0 m²·K/W, pare-vapeur et surface à documenter',
          'prime_cee_indicative_eur_m2',jsonb_build_object('bleu',11,'jaune',7,'violet',7,'rose',7)),
        (p->>'prix')::numeric,'m2',5.5,false,true,'BAR-EN-103',true,
        'particulier','particulier',0,0
      );
    ELSE
      UPDATE public.catalogue_produits SET categorie='plancher',nom=p->>'nom',marque=p->>'marque',
        description='Panneau ou isolant pour isolation du plancher bas. Prix indicatif de fourniture seule communiqué par Reno Soluces le 19/10/2026 ; confirmer la fiche fabricant et la référence exacte avant commande.',
        prix_unitaire_ht=(p->>'prix')::numeric,unite='m2',tva_taux=5.5,
        eligible_mpr=false,eligible_cee=true,fiche_cee='BAR-EN-103',actif=true,
        public_cible='particulier',catalogue_groupe='particulier',
        forfait_pose_ht=0,forfait_evacuation_ht=0,
        caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',(p->>'r')::numeric,
          'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026',
          'prix_fourniture_seule',true,'fiche_cee','BAR-EN-103',
          'condition_cee','R ≥ 3,0 m²·K/W, pare-vapeur et surface à documenter',
          'prime_cee_indicative_eur_m2',jsonb_build_object('bleu',11,'jaune',7,'violet',7,'rose',7))
      WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;

  -- Prestations distinctes de pose : facturation au m², à sélectionner selon la méthode.
  FOR p IN SELECT value FROM jsonb_array_elements($poses$
  [
    {"reference":"POSE-PLANCHER-SOUS-FACE","nom":"Forfait pose plancher bas — sous-face (garage / sous-sol)","prix":30.00,"mode":"Fixation mécanique ou collage en sous-face"},
    {"reference":"POSE-PLANCHER-SOUS-CHAPE","nom":"Forfait pose plancher bas — sous chape","prix":22.00,"mode":"Pose au sol avant coulage de la chape"}
  ]$poses$::jsonb) LOOP
    SELECT id INTO v_id FROM public.catalogue_produits
      WHERE entreprise_id=v_entreprise AND reference=p->>'reference' LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'plancher',p->>'nom','Reno Soluces',p->>'reference',p->>'mode',
        jsonb_build_object('type_ligne','forfait_pose','mode_pose',p->>'mode','prix_source','Tarif communiqué par Reno Soluces le 19/10/2026'),
        (p->>'prix')::numeric,'m2',5.5,false,false,'',true,'particulier','particulier',0,0
      );
    ELSE
      UPDATE public.catalogue_produits SET categorie='plancher',nom=p->>'nom',marque='Reno Soluces',
        description=p->>'mode',prix_unitaire_ht=(p->>'prix')::numeric,unite='m2',tva_taux=5.5,
        eligible_mpr=false,eligible_cee=false,fiche_cee='',actif=true,
        public_cible='particulier',catalogue_groupe='particulier',
        caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) ||
          jsonb_build_object('type_ligne','forfait_pose','mode_pose',p->>'mode','prix_source','Tarif communiqué par Reno Soluces le 19/10/2026')
      WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;

-- Solaire thermique : prix fourniture seule et forfait de pose séparé.
DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN RETURN; END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"reference":"DD-INISOL-UNO-E-200","nom":"De Dietrich Inisol Uno E 200 — ballon solaire 225 L","marque":"De Dietrich","prix":2402.00,"type":"Ballon solaire seul","volume":225,"appoint":"Électrique"},
    {"reference":"DD-INISOL-UNO-BSL-300","nom":"De Dietrich Inisol Uno BSL 300 — ballon solaire 300 L","marque":"De Dietrich","prix":2591.00,"type":"Ballon solaire seul","volume":300,"appoint":"Hydraulique"},
    {"reference":"DD-INISOL-UNO-E-400","nom":"De Dietrich Inisol Uno E 400 — ballon solaire 400 L","marque":"De Dietrich","prix":4070.00,"type":"Ballon solaire seul","volume":400,"appoint":"Électrique"},
    {"reference":"DD-PACK-DH200-1","nom":"Pack De Dietrich 1 capteur DH200","marque":"De Dietrich","prix":1556.00,"type":"Pack capteurs toiture","surface":2,"capteurs":1},
    {"reference":"DD-PACK-D230-2","nom":"Pack De Dietrich 2 capteurs D230","marque":"De Dietrich","prix":2616.00,"type":"Pack capteurs toiture","surface":5,"capteurs":2},
    {"reference":"DD-PACK-DH200-3","nom":"Pack De Dietrich 3 capteurs DH200","marque":"De Dietrich","prix":4024.00,"type":"Pack capteurs toiture","surface":6,"capteurs":3},
    {"reference":"GIORDANO-GIORSOL-ATV-200","nom":"Giordano Giorsol ATV 200 — kit autovidange","marque":"Giordano","prix":2250.00,"type":"Kit complet autovidange","volume":200},
    {"reference":"SAUNIER-DUVAL-HELIOSET-250E","nom":"Saunier Duval HelioSet 250 E — kit pressurisé","marque":"Saunier Duval","prix":2950.00,"type":"Kit complet pressurisé","volume":252},
    {"reference":"VIESSMANN-VITOSOL-141-FM-SURIMP","nom":"Viessmann Vitosol 141-FM Surimposition — kit complet","marque":"Viessmann","prix":4100.00,"type":"Kit complet prêt à poser","volume":250,"capteurs":2}
  ]$products$::jsonb) LOOP
    SELECT id INTO v_id FROM public.catalogue_produits WHERE entreprise_id=v_entreprise AND reference=p->>'reference' LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'solaire_thermique',p->>'nom',p->>'marque',p->>'reference',
        'Prix indicatif de fourniture seule communiqué par Reno Soluces le 19/10/2026. Vérifier la compatibilité du système complet, la documentation fabricant et la fiche CEE applicable.',
        jsonb_strip_nulls(jsonb_build_object('type_produit',p->>'type','volume_ballon_L',(p->>'volume')::numeric,
          'appoint',p->>'appoint','surface_capteurs_m2',(p->>'surface')::numeric,
          'nombre_capteurs',(p->>'capteurs')::numeric,'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026',
          'prix_fourniture_seule',true,'fiche_cee','BAR-TH-168',
          'mpr_indicative_eur',jsonb_build_object('bleu',4000,'jaune',3000,'violet',2000,'rose',0),
          'cee_indicative_note','Prime BAR-TH-168 variable selon surface, zone climatique, usage et offre du délégataire; ne pas présenter comme montant garanti.')),
        (p->>'prix')::numeric,'unite',5.5,true,true,'BAR-TH-168',true,
        'particulier','particulier',0,0
      );
    ELSE
      UPDATE public.catalogue_produits SET categorie='solaire_thermique',nom=p->>'nom',marque=p->>'marque',
        description='Prix indicatif de fourniture seule communiqué par Reno Soluces le 19/10/2026. Vérifier la compatibilité du système complet, la documentation fabricant et la fiche CEE applicable.',
        prix_unitaire_ht=(p->>'prix')::numeric,unite='unite',tva_taux=5.5,
        eligible_mpr=true,eligible_cee=true,fiche_cee='BAR-TH-168',actif=true,
        public_cible='particulier',catalogue_groupe='particulier',
        caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) ||
          jsonb_strip_nulls(jsonb_build_object('type_produit',p->>'type','volume_ballon_L',(p->>'volume')::numeric,
            'appoint',p->>'appoint','surface_capteurs_m2',(p->>'surface')::numeric,
            'nombre_capteurs',(p->>'capteurs')::numeric,'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026',
            'prix_fourniture_seule',true,'fiche_cee','BAR-TH-168',
            'mpr_indicative_eur',jsonb_build_object('bleu',4000,'jaune',3000,'violet',2000,'rose',0),
            'cee_indicative_note','Prime BAR-TH-168 variable selon surface, zone climatique, usage et offre du délégataire; ne pas présenter comme montant garanti.'))
      WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;

  SELECT id INTO v_id FROM public.catalogue_produits
    WHERE entreprise_id=v_entreprise AND reference='POSE-SOLAIRE-THERMIQUE-BARTH168' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.catalogue_produits (
      entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
      prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
      public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
    ) VALUES (
      v_entreprise,'solaire_thermique','Forfait pose solaire thermique — toiture, ballon et raccordements',
      'Reno Soluces','POSE-SOLAIRE-THERMIQUE-BARTH168',
      'Pose des rails de surimposition, raccordement des liaisons isolées, pose du groupe de transfert, du vase d’expansion solaire et de la régulation. Forfait indicatif à confirmer selon chantier.',
      '{"type_ligne":"forfait_pose","prix_source":"Tarif communiqué par Reno Soluces le 19/10/2026"}'::jsonb,
      2050,'forfait',5.5,false,false,'',true,'particulier','particulier',0,0
    );
  ELSE
    UPDATE public.catalogue_produits SET nom='Forfait pose solaire thermique — toiture, ballon et raccordements',
      prix_unitaire_ht=2050,unite='forfait',tva_taux=5.5,actif=true,
      description='Pose des rails de surimposition, raccordement des liaisons isolées, pose du groupe de transfert, du vase d’expansion solaire et de la régulation. Forfait indicatif à confirmer selon chantier.',
      caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || '{"type_ligne":"forfait_pose","prix_source":"Tarif communiqué par Reno Soluces le 19/10/2026"}'::jsonb
    WHERE id=v_id;
  END IF;
END $$;

COMMIT;
