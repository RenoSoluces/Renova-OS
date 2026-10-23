/*
  Renova OS — catégorie Isolation par l'extérieur (ITE).
  Prix des matériaux laissés à 0 HT : les montants des devis d'exemple ne sont pas des prix catalogue validés.
  TVA des isolants à confirmer au chantier; le taux enregistré est une valeur de départ modifiable.
  Les informations techniques proviennent des éléments fournis par Reno Soluces; la documentation correspondant
  exactement à chaque référence doit être jointe/contrôlée avant de revendiquer une certification ou un CEE.
*/
DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : aucun produit ITE inséré.';
    RETURN;
  END IF;

  -- Reclasse les isolants ITE déjà présents dans l'ancienne catégorie générique « murs ».
  UPDATE catalogue_produits
  SET categorie = 'ite', public_cible = 'particulier', catalogue_groupe = 'particulier'
  WHERE categorie IN ('murs','autre','ite')
    AND reference <> '16/201/1123'
    AND nom NOT ILIKE '%THERMOLOOK EMI ANCIEN%'
    AND (reference IN ('239630','235043','35343','13056','87220','2816688','2816743','2816745','231110','102713','100545','346881','656234','656159','FAC_ECHAFAUDAGE','FAC_ENDUIT')
      OR nom ILIKE '%THERMOLOOK EMI ANCIEN%'
      OR nom ILIKE '%Ecorock Mono%' OR nom ILIKE '%Efigreen ITE%' OR nom ILIKE '%Graphipan ITE%'
      OR nom ILIKE '%Isofaçade%' OR nom ILIKE '%ITEx%' OR nom ILIKE '%Pavawall Smart%'
      OR nom ILIKE '%Rockfaçade%' OR nom ILIKE '%Smartfaçade%');

  -- Convertit l'ancien produit ITE générique déjà présent en référence PRB réellement communiquée.
  UPDATE catalogue_produits
  SET categorie = 'ite',
      nom = 'Panneau PSE PRB FACADE TH 38 — 170 mm',
      marque = 'PRB',
      reference = 'PRB FACADE TH 38',
      description = 'Panneau PSE pour système d’isolation thermique par l’extérieur PRB THERMOLOOK EMI ANCIEN. Données de référence communiquées : épaisseur 170 mm, λ 0,038 W/(m·K), R 4,45 m²·K/W. Vérifier la validité du DTA et du certificat pour le système complet.',
      caracteristiques = COALESCE(caracteristiques,'{}'::jsonb) || '{"type_isolant":"Panneaux de polystyrène expansé (PSE)","epaisseur_mm":170,"conductivite_thermique_W_mK":0.038,"resistance_thermique_R_m2K_W":4.45,"norme":"NF EN 13163:2012+A2:2016","acermi":"16/201/1123","dta":"7/18-1716","classement_sanitaire":"A+"}'::jsonb,
      prix_unitaire_ht = 0,
      forfait_pose_ht = 0, forfait_evacuation_ht = 0,
      eligible_mpr = false, eligible_cee = false, fiche_cee = '',
      public_cible = 'particulier',
      catalogue_groupe = 'particulier',
      actif = true
  WHERE categorie IN ('murs','autre','ite')
    AND (nom ILIKE '%THERMOLOOK EMI ANCIEN%' OR reference IN ('16/201/1123','PRB FACADE TH 38'))
    AND NOT EXISTS (SELECT 1 FROM catalogue_produits x WHERE x.categorie='ite' AND x.reference='PRB FACADE TH 38');

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"reference":"PRB FACADE TH 38","nom":"Panneau PSE PRB FACADE TH 38 — 170 mm","marque":"PRB","description":"Panneau PSE pour système d’isolation thermique par l’extérieur PRB THERMOLOOK EMI ANCIEN. Vérifier la validité du DTA et du certificat pour le système complet.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Panneaux de polystyrène expansé (PSE)","gamme":"PRB THERMOLOOK EMI ANCIEN","epaisseur_mm":170,"conductivite_thermique_W_mK":0.038,"resistance_thermique_R_m2K_W":4.45,"norme":"NF EN 13163:2012+A2:2016","acermi":"16/201/1123","dta":"7/18-1716","classement_sanitaire":"A+"}},
    {"reference":"ECOBILLES-200","nom":"Écobilles Inject-Styrène Diffusion — 200 mm","marque":"Inject-Styrène Diffusion","description":"Isolant en écobilles injectées en paroi/cavité. Les caractéristiques ci-dessous sont reprises de la description fournie et doivent être rapprochées de la fiche ACERMI correspondant au produit exact.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Écobilles","epaisseur_mm":200,"conductivite_thermique_W_mK":0.033,"resistance_thermique_R_m2K_W":6,"acermi":"16/210/1178","classement_sanitaire":"A+","mode_pose":"Injection"}},
    {"reference":"239630","nom":"Rockwool Ecorock Mono — 134 mm","marque":"Rockwool","description":"Panneau de laine de roche pour isolation des murs par l’extérieur sous enduit (ETICS). Vérifier que le certificat et l’avis technique couvrent le système complet de pose choisi.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de roche","epaisseur_mm":134,"dimensions_mm":"1200 × 600","surface_colis_m2":1.44,"conductivite_thermique_W_mK":0.036,"resistance_thermique_R_m2K_W":3.7,"acermi":"16/015/1097","euroclasse":"A1","mode_pose":"Sous-enduit / ETICS"}},
    {"reference":"235043","nom":"Soprema Efigreen ITE — 82 mm","marque":"Soprema","description":"Panneau isolant polyuréthane annoncé pour l’isolation des murs par l’extérieur sous bardage ventilé. Vérifier la destination exacte dans la documentation fabricant avant emploi.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Polyuréthane","epaisseur_mm":82,"dimensions_mm":"1200 × 1000","surface_colis_m2":4.8,"conductivite_thermique_W_mK":0.022,"resistance_thermique_R_m2K_W":3.7,"acermi":"03/006/109","mode_pose":"Sous bardage ventilé (à confirmer sur documentation fabricant)"}},
    {"reference":"35343","nom":"Hirsch Graphipan ITE TH32 — 140 mm","marque":"Hirsch Isolation","description":"Panneau PSE graphité pour système d’isolation thermique par l’extérieur. Les données source mentionnent 140/141 mm; épaisseur nominale et R à confirmer sur la fiche produit correspondant au code livré.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"PSE graphité","epaisseur_mm":"140 (source mentionne aussi 141 mm)","dimensions_mm":"1200 × 600","conductivite_thermique_W_mK":0.032,"resistance_thermique_R_m2K_W":4.4,"norme":"NF EN 13163","referentiel_pose":"CPT 3035 V3 (selon source fournie)","code_isole":"35343","surface_palette_m2":28.8}},
    {"reference":"13056","nom":"Isover Isofaçade 30P — 120 mm","marque":"Isover","description":"Panneau de laine de verre pour façade ventilée. Vérifier le domaine d’emploi exact et les conditions de pose dans la documentation Isover.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de verre","epaisseur_mm":120,"dimensions_mm":"1350 × 600","surface_colis_m2":3.24,"conductivite_thermique_W_mK":0.03,"resistance_thermique_R_m2K_W":4,"acermi":"17/018/1244","euroclasse":"A1","mode_pose":"Sous bardage ventilé (selon source fournie)"}},
    {"reference":"87220","nom":"Isover Isofaçade 32R — 120 mm","marque":"Isover","description":"Rouleau de laine de verre annoncé pour façade ventilée ou préfabriquée. Vérifier le domaine d’emploi exact sur la documentation fabricant.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de verre en rouleau","epaisseur_mm":120,"dimensions_mm":"3700 × 600","surface_colis_m2":4.44,"conductivite_thermique_W_mK":0.032,"resistance_thermique_R_m2K_W":3.75,"euroclasse":"A1 (source fournie)","mode_pose":"Façade ventilée ou préfabriquée (à confirmer)"}},
    {"reference":"2816688","nom":"Knauf Therm ITEx TH38 SE — 140 mm","marque":"Knauf","description":"Panneau PSE pour isolation thermique par l’extérieur sous enduit (ETICS). Vérifier l’ACERMI et l’avis technique en cours de validité pour l’épaisseur exacte.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"PSE","epaisseur_mm":140,"dimensions_mm":"1200 × 600","surface_colis_m2":2.16,"conductivite_thermique_W_mK":0.038,"resistance_thermique_R_m2K_W":3.7,"euroclasse":"E (source fournie)","mode_pose":"Sous-enduit / ETICS"}},
    {"reference":"2816743","nom":"Knauf XTherm ITEx Sun+ graphité — 120 mm","marque":"Knauf","description":"Panneau PSE graphité pour isolation des murs par l’extérieur sous enduit. Référence produit fournie par Reno Soluces.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"PSE graphité","epaisseur_mm":120,"dimensions_mm":"1200 × 600","surface_colis_m2":2.88,"conductivite_thermique_W_mK":0.031,"resistance_thermique_R_m2K_W":3.85,"acermi":"07/007/494","mode_pose":"Sous-enduit / ETICS"}},
    {"reference":"2816745","nom":"Knauf XTherm ITEx Sun+ graphité — 140 mm","marque":"Knauf","description":"Panneau PSE graphité pour isolation des murs par l’extérieur sous enduit. Référence produit fournie par Reno Soluces.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"PSE graphité","epaisseur_mm":140,"dimensions_mm":"1200 × 600","surface_colis_m2":2.16,"conductivite_thermique_W_mK":0.031,"resistance_thermique_R_m2K_W":4.5,"acermi":"07/007/494","mode_pose":"Sous-enduit / ETICS"}},
    {"reference":"231110","nom":"Soprema Pavawall Smart — 145 mm","marque":"Soprema","description":"Panneau de fibre de bois pour isolation des murs par l’extérieur sous enduit, pose collée selon les données source. Vérifier la configuration système approuvée.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Fibre de bois","epaisseur_mm":145,"dimensions_mm":"940 × 600","surface_panneau_m2":0.56,"conductivite_thermique_W_mK":0.039,"resistance_thermique_R_m2K_W":3.7,"euroclasse":"E (source fournie)","mode_pose":"Sous-enduit, panneau collé (selon source)"}},
    {"reference":"102713","nom":"Rockwool Rockfaçade — 130 mm","marque":"Rockwool","description":"Panneau de laine de roche pour façade ventilée selon les données source. La même référence est également indiquée pour un colis de 4,05 m²; vérifier le conditionnement fournisseur.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de roche","epaisseur_mm":130,"dimensions_mm":"1350 × 600","conductivite_thermique_W_mK":0.035,"resistance_thermique_R_m2K_W":3.7,"acermi":"02/015/027","euroclasse":"A1","mode_pose":"Sous bardage ventilé (selon source)"}},
    {"reference":"100545","nom":"Rockwool Rockfaçade — 150 mm","marque":"Rockwool","description":"Panneau de laine de roche pour façade ventilée selon les données source. Vérifier la fiche technique correspondant exactement à la référence et à l’épaisseur.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de roche","epaisseur_mm":150,"dimensions_mm":"1350 × 600","surface_colis_m2":3.24,"conductivite_thermique_W_mK":0.035,"resistance_thermique_R_m2K_W":4.25,"acermi":"02/015/027","euroclasse":"A1","mode_pose":"Sous bardage ventilé (selon source)"}},
    {"reference":"346881","nom":"Rockwool Rockfaçade Premium — 120 mm","marque":"Rockwool","description":"Panneau de laine de roche pour façade ventilée selon les données source. Vérifier le domaine d’emploi et la certification associés à la référence exacte.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de roche","epaisseur_mm":120,"dimensions_mm":"1350 × 600","surface_colis_m2":2.43,"conductivite_thermique_W_mK":0.032,"resistance_thermique_R_m2K_W":3.75,"acermi":"18/015/1327","euroclasse":"A1","mode_pose":"Sous bardage ventilé (selon source)"}},
    {"reference":"656234","nom":"Knauf Insulation Smartfaçade 35 BR — 140 mm","marque":"Knauf Insulation","description":"Rouleau de laine de verre destiné à une façade ventilée selon les données fournies. Vérifier la référence et le domaine d’emploi exacts dans la documentation fabricant.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de verre en rouleau","epaisseur_mm":140,"dimensions_mm":"4500 × 600","surface_colis_m2":5.4,"conductivite_thermique_W_mK":0.035,"resistance_thermique_R_m2K_W":4,"euroclasse":"A1 (source fournie)","mode_pose":"Sous bardage ventilé (selon source)"}},
    {"reference":"656159","nom":"Knauf Insulation Smartfaçade 32 BR — 120 mm","marque":"Knauf Insulation","description":"Rouleau de laine de verre destiné à une façade ventilée selon les données fournies. Vérifier l’ACERMI en cours de validité et le domaine d’emploi exact.","unite":"m2","tva":20,"caracteristiques":{"type_isolant":"Laine de verre en rouleau","epaisseur_mm":120,"dimensions_mm":"3300 × 600","surface_colis_m2":3.96,"conductivite_thermique_W_mK":0.032,"resistance_thermique_R_m2K_W":3.75,"acermi":"10/016/640","euroclasse":"A1","mode_pose":"Sous bardage ventilé (selon source)"}},
    {"reference":"FAC_ECHAFAUDAGE","nom":"Échafaudage de façade — montage, location et démontage","marque":"Prestation","prix_ht":24,"description":"Échafaudage de pied conforme, montage/démontage, garde-corps et plinthes, facturé au m² de façade échafaudée. Surface à mesurer séparément de la surface isolée si elles diffèrent.","unite":"m2","tva":10,"caracteristiques":{"prestation":"Montage, location et démontage d’échafaudage de façade","unite_facturation":"m² de façade échafaudée","securite":"Garde-corps et plinthes"}},
    {"reference":"FAC_ENDUIT","nom":"Enduit de façade monocouche teinté — finition grattée","marque":"Prestation","prix_ht":72,"description":"Préparation du support et application d’un enduit monocouche teinté dans la masse, finition grattée, hors échafaudage. Mise en œuvre selon NF DTU 26.1 et prescriptions du système retenu.","unite":"m2","tva":10,"caracteristiques":{"prestation":"Préparation du support et enduit monocouche","finition":"Grattée","norme":"NF DTU 26.1","echafaudage_inclus":false}}
  ]
  $products$::jsonb) LOOP
    SELECT id INTO v_id FROM catalogue_produits
    WHERE categorie = 'ite'
      AND ((COALESCE(p->>'reference','') <> '' AND reference = p->>'reference') OR lower(nom)=lower(p->>'nom'))
    ORDER BY CASE WHEN reference = p->>'reference' AND COALESCE(p->>'reference','') <> '' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'ite',p->>'nom',COALESCE(p->>'marque',''),COALESCE(p->>'reference',''),
        COALESCE(p->>'description',''),COALESCE(p->'caracteristiques','{}'::jsonb),
        COALESCE(NULLIF(p->>'prix_ht','')::numeric,0),COALESCE(p->>'unite','m2'),COALESCE(NULLIF(p->>'tva','')::numeric,20),false,false,'',true,
        'particulier','particulier',0,0
      );
    ELSE
      UPDATE catalogue_produits SET
        nom = p->>'nom', marque = COALESCE(NULLIF(p->>'marque',''),marque),
        reference = COALESCE(NULLIF(p->>'reference',''),reference),
        description = COALESCE(NULLIF(p->>'description',''),description),
        caracteristiques = COALESCE(caracteristiques,'{}'::jsonb) || COALESCE(p->'caracteristiques','{}'::jsonb),
        prix_unitaire_ht = COALESCE(NULLIF(p->>'prix_ht','')::numeric,0), forfait_pose_ht = 0, forfait_evacuation_ht = 0,
        unite = COALESCE(NULLIF(p->>'unite',''),unite),
        tva_taux = COALESCE(NULLIF(p->>'tva','')::numeric,tva_taux),
        eligible_mpr = false, eligible_cee = false, fiche_cee = '', actif = true,
        public_cible = 'particulier', catalogue_groupe = 'particulier'
      WHERE id = v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;
