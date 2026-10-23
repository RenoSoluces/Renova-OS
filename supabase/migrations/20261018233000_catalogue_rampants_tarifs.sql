-- Reno Soluces — tarifs isolation des rampants communiqués le 18/10/2026.
-- Les prix saisis sont les prix HT/m² transmis par Reno Soluces.
-- Les TTC sont conservés en caractéristiques pour contrôle; le devis calcule
-- le TTC à partir du taux de TVA renseigné. Aucun forfait de pose séparé n'est
-- ajouté lorsque le détail fourniture/pose n'a pas été communiqué.
-- Pour le sarking, la main-d'œuvre de 90 à 130 €/m² HT est une fourchette indicative
-- et reste une note : ne pas sélectionner arbitrairement un prix fixe.

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : aucun produit rampants inséré.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"reference":"RAMP-INJECTION-BILLES-OUATE","nom":"Rampants — Injection (billes / ouate)","marque":"À préciser","description":"Isolation des rampants par injection de billes ou insufflation de ouate. Éligibilité CEE conditionnée à une résistance thermique R ≥ 6 m²·K/W justifiée pour la solution effectivement mise en œuvre.","prix_ht":40.00,"tva":5.5,"r":null,"type":"Injection / vrac","cee_condition":"Éligible sous condition de R ≥ 6 m²·K/W","prix_ttc_source":42.20},
    {"reference":"ISONAT-FLEX40-120","nom":"Isonat Flex 40 — 120 mm","marque":"Isonat","description":"Panneau flexible en fibre de bois pour rampants. Une pose en double couche est nécessaire pour atteindre les conditions CEE indiquées par Reno Soluces.","prix_ht":13.80,"tva":5.5,"r":3.15,"type":"Fibre de bois","cee_condition":"Double couche nécessaire selon la règle communiquée; vérifier le R total du complexe","prix_ttc_source":14.56},
    {"reference":"ISONAT-FLEX40-145","nom":"Isonat Flex 40 — 145 mm","marque":"Isonat","description":"Panneau flexible en fibre de bois pour rampants. Une pose en double couche est nécessaire pour atteindre les conditions CEE indiquées par Reno Soluces.","prix_ht":16.70,"tva":5.5,"r":3.81,"type":"Fibre de bois","cee_condition":"Double couche nécessaire selon la règle communiquée; vérifier le R total du complexe","prix_ttc_source":17.62},
    {"reference":"ISONAT-FLEX40-160","nom":"Isonat Flex 40 — 160 mm","marque":"Isonat","description":"Panneau flexible en fibre de bois pour rampants. Une pose en double couche est nécessaire pour atteindre les conditions CEE indiquées par Reno Soluces.","prix_ht":18.40,"tva":5.5,"r":4.21,"type":"Fibre de bois","cee_condition":"Double couche nécessaire selon la règle communiquée; vérifier le R total du complexe","prix_ttc_source":19.41},
    {"reference":"ISONAT-FLEX40-200","nom":"Isonat Flex 40 — 200 mm","marque":"Isonat","description":"Panneau flexible en fibre de bois pour rampants. La résistance thermique indiquée est sous le seuil CEE en monocouche.","prix_ht":23.00,"tva":5.5,"r":5.25,"type":"Fibre de bois","cee_condition":"Sous le seuil indiqué en monocouche; vérifier le R total du complexe","prix_ttc_source":24.27},
    {"reference":"STEICO-FLEX036-240","nom":"Steico Flex 036 — 240 mm","marque":"Steico","description":"Panneau flexible en fibre de bois pour isolation des rampants.","prix_ht":21.10,"tva":5.5,"r":6.65,"type":"Fibre de bois","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":22.26},
    {"reference":"SOPREMA-PAVAFLEX-CONFORT-240","nom":"Soprema Pavaflex Confort — 240 mm","marque":"Soprema","description":"Isolant flexible en fibre de bois pour rampants.","prix_ht":35.30,"tva":5.5,"r":6.30,"type":"Fibre de bois","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":37.24},
    {"reference":"SOPREMA-PAVAFLEX-CONFORT36-220","nom":"Soprema Pavaflex Confort 36 — 220 mm","marque":"Soprema","description":"Isolant flexible en fibre de bois pour rampants.","prix_ht":36.00,"tva":5.5,"r":6.10,"type":"Fibre de bois","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":37.98},
    {"reference":"SOPREMA-PAVAFLEX-CONFORT36-240","nom":"Soprema Pavaflex Confort 36 — 240 mm","marque":"Soprema","description":"Isolant flexible en fibre de bois pour rampants.","prix_ht":39.25,"tva":5.5,"r":6.65,"type":"Fibre de bois","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":41.41},
    {"reference":"ROCKWOOL-ROCKCOMBLE-NU-210","nom":"Rockwool Rockcomble Nu — 210 mm","marque":"Rockwool","description":"Panneau de laine de roche pour isolation des rampants.","prix_ht":26.41,"tva":5.5,"r":6.00,"type":"Laine de roche","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":27.86},
    {"reference":"ROCKWOOL-ROCKCOMBLE-EVOLUTION-200","nom":"Rockwool Rockcomble Évolution — 200 mm","marque":"Rockwool","description":"Panneau de laine de roche pour isolation des rampants.","prix_ht":32.47,"tva":5.5,"r":6.05,"type":"Laine de roche","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":34.26},
    {"reference":"ROCKWOOL-ROCKPLUS-PREMIUM-KRAFT-200","nom":"Rockwool Rockplus Premium Kraft — 200 mm","marque":"Rockwool","description":"Panneau de laine de roche avec parement kraft pour isolation des rampants.","prix_ht":36.52,"tva":5.5,"r":6.25,"type":"Laine de roche","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":38.53},
    {"reference":"ROCKWOOL-ROCKCOMBLE-EVOLUTION-231","nom":"Rockwool Rockcomble Évolution — 231 mm","marque":"Rockwool","description":"Panneau de laine de roche pour isolation des rampants.","prix_ht":37.59,"tva":5.5,"r":7.00,"type":"Laine de roche","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":39.66},
    {"reference":"ISOVER-ISOCONFORT35-KRAFT-220","nom":"Isover Isoconfort 35 Kraft — 220 mm","marque":"Isover","description":"Laine de verre avec parement kraft pour isolation des rampants.","prix_ht":14.80,"tva":5.5,"r":6.25,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":15.61},
    {"reference":"KNAUF-NATUROLL035-220","nom":"Knauf Insulation Naturoll 035 — 220 mm","marque":"Knauf Insulation","description":"Rouleau de laine de verre pour isolation des rampants.","prix_ht":17.50,"tva":5.5,"r":6.25,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":18.46},
    {"reference":"URSA-MRK35-KRAFT-220","nom":"URSA MRK 35 Kraft — 220 mm","marque":"URSA","description":"Laine de verre avec parement kraft pour isolation des rampants.","prix_ht":24.15,"tva":5.5,"r":6.25,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":25.48},
    {"reference":"ISOVER-ISOCONFORT35-KRAFT-280","nom":"Isover Isoconfort 35 Kraft — 280 mm","marque":"Isover","description":"Laine de verre avec parement kraft pour isolation des rampants.","prix_ht":25.85,"tva":5.5,"r":8.00,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":27.27},
    {"reference":"KNAUF-KI-FIT-037-370","nom":"Knauf Insulation KI Fit 037 — 370 mm","marque":"Knauf Insulation","description":"Laine de verre pour isolation des rampants.","prix_ht":33.90,"tva":5.5,"r":10.00,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":35.76},
    {"reference":"KNAUF-KI-FIT-032-200","nom":"Knauf Insulation KI Fit 032 — 200 mm","marque":"Knauf Insulation","description":"Laine de verre pour isolation des rampants.","prix_ht":36.50,"tva":5.5,"r":6.30,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":38.51},
    {"reference":"ISOVER-ISOCONFORT32-KRAFT-200","nom":"Isover Isoconfort 32 Kraft — 200 mm","marque":"Isover","description":"Laine de verre avec parement kraft pour isolation des rampants.","prix_ht":39.75,"tva":5.5,"r":6.25,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":41.94},
    {"reference":"URSA-HOMETEC32-NU-200","nom":"URSA Hometec 32 Nu — 200 mm","marque":"URSA","description":"Laine de verre pour isolation des rampants.","prix_ht":42.55,"tva":5.5,"r":6.25,"type":"Laine de verre","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":44.89},
    {"reference":"SOPREMA-EFISARKING-130","nom":"Soprema Efisarking — 130 mm","marque":"Soprema","description":"Panneau isolant pour isolation de toiture par l'extérieur en sarking. Dépose complète de la couverture (tuiles/liteaux) à prévoir. La main-d'œuvre de charpente/couverture est à chiffrer séparément : fourchette indicative communiquée de 90 à 130 € HT/m².","prix_ht":62.05,"tva":5.5,"r":6.00,"type":"Sarking / isolation toiture par l'extérieur","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":65.46},
    {"reference":"SOPREMA-EFISARKING-160","nom":"Soprema Efisarking — 160 mm","marque":"Soprema","description":"Panneau isolant pour isolation de toiture par l'extérieur en sarking. Dépose complète de la couverture (tuiles/liteaux) à prévoir. La main-d'œuvre de charpente/couverture est à chiffrer séparément : fourchette indicative communiquée de 90 à 130 € HT/m².","prix_ht":76.40,"tva":5.5,"r":7.40,"type":"Sarking / isolation toiture par l'extérieur","cee_condition":"R ≥ 6 m²·K/W selon les données communiquées","prix_ttc_source":80.60},
    {"reference":"TETRIS-SUPER-12","nom":"Tetris Super 12 — isolant mince thermo-réflecteur","marque":"Tetris","description":"Isolant mince thermo-réflecteur. Ne considérer l'éligibilité CEE que si une résistance thermique R ≥ 6 m²·K/W est justifiée par une certification d'un organisme accrédité pour le système réellement installé.","prix_ht":40.00,"tva":5.5,"r":null,"type":"Isolant mince thermo-réflecteur","cee_condition":"Conditionnel : certification avec R ≥ 6 m²·K/W exigée","prix_ttc_source":42.20}
  ]
  $products$::jsonb) LOOP
    SELECT id INTO v_id FROM catalogue_produits
    WHERE categorie = 'combles'
      AND (reference = p->>'reference' OR lower(nom) = lower(p->>'nom'))
    ORDER BY CASE WHEN reference = p->>'reference' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'combles',p->>'nom',p->>'marque',p->>'reference',p->>'description',
        jsonb_strip_nulls(jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',p->'r',
          'condition_cee',p->>'cee_condition','prix_ttc_source_m2',p->'prix_ttc_source',
          'prix_source','Tarif communiqué par Reno Soluces le 18/10/2026',
          'prix_unitaire_catalogue_ht_m2',p->'prix_ht','forfait_pose_ht_m2',0,
          'note_tarif','Le prix fourni n’est pas ventilé entre fourniture et pose.'
        )),
        (p->>'prix_ht')::numeric,'m2',(p->>'tva')::numeric,false,false,'',true,
        'particulier','particulier',0,0
      );
    ELSE
      UPDATE catalogue_produits SET
        nom = p->>'nom', marque = p->>'marque', reference = p->>'reference',
        description = p->>'description',
        caracteristiques = COALESCE(caracteristiques,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',p->'r',
          'condition_cee',p->>'cee_condition','prix_ttc_source_m2',p->'prix_ttc_source',
          'prix_source','Tarif communiqué par Reno Soluces le 18/10/2026',
          'prix_unitaire_catalogue_ht_m2',p->'prix_ht','forfait_pose_ht_m2',0,
          'note_tarif','Le prix fourni n’est pas ventilé entre fourniture et pose.'
        )),
        prix_unitaire_ht = (p->>'prix_ht')::numeric, unite = 'm2', tva_taux = (p->>'tva')::numeric,
        eligible_mpr = false, eligible_cee = false, fiche_cee = '', actif = true,
        public_cible = 'particulier', catalogue_groupe = 'particulier',
        forfait_pose_ht = 0, forfait_evacuation_ht = 0
      WHERE id = v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;
