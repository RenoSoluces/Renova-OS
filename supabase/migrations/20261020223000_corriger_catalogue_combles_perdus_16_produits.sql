-- Reno Soluces — reprise des 16 produits « Combles perdus » à partir du condensé transmis le 20/10/2026.
-- Les prix communiqués sont des prix de fourniture HT/m². La pose est une ligne distincte :
-- soufflage = 16 €/m² HT ; déroulage = 18 €/m² HT.
-- Ne modifie pas les forfaits d'évacuation existants et ne supprime aucune ligne tarifaire.
-- Les références déjà présentes sont reconnues par alias pour éviter de recréer les 15 produits existants.

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
  v_reference_existante text;
  v_pose numeric;
  v_r numeric;
  v_eligible_cee boolean;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : correction des produits combles perdus ignorée.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {
      "reference":"COMBLES-PULSR-FORFAIT","aliases":["COMBLES-PULSR-FORFAIT","PULSR"],
      "nom":"PULSR — isolation des combles perdus par soufflage",
      "marque":"URSA","description":"Isolation des combles perdus par soufflage d’un isolant en laine minérale en vrac. La référence et la résistance thermique doivent correspondre au produit effectivement livré et à l’épaisseur mise en œuvre.",
      "prix":30.00,"pose":"soufflage","type":"Laine minérale en vrac — soufflage","r":null,"epaisseur_mm":null,"lambda":null,"acermi":null
    },
    {
      "reference":"ISOVER-COMBLISSIMO-R7","aliases":["ISOVER-COMBLISSIMO-R7","ISOVER-COMBLISSIMO"],
      "nom":"Laine de verre à souffler Isover Comblissimo — R 7",
      "marque":"Isover","description":"Laine de verre en vrac destinée à l’isolation des combles perdus par soufflage. Pour R = 7 m²·K/W : consommation indicative communiquée de 21,8 sacs de 17,3 kg pour 100 m². La quantité réelle dépend de la surface, de l’épaisseur et des prescriptions de mise en œuvre.",
      "prix":17.66,"pose":"soufflage","type":"Laine de verre en vrac — soufflage","r":7,"epaisseur_mm":null,"lambda":0.046,"acermi":"07/D/18/474"
    },
    {
      "reference":"VOLCALIS-EASY-LAINE-MINERALE","aliases":["VOLCALIS-EASY-LAINE-MINERALE","1_DEROULE_EASY_LAINE_MINERALE_ISOLATIO"],
      "nom":"1. Déroulé EASY — laine minérale pour combles perdus",
      "marque":"Volcalis","description":"Isolant en laine minérale destiné à l’isolation des combles perdus par déroulage. L’épaisseur et la résistance thermique doivent être renseignées à partir de la référence fabricant réellement fournie avant de confirmer les performances et l’éligibilité aux aides.",
      "prix":30.00,"pose":"déroulage","type":"Laine minérale en rouleaux — déroulage","r":null,"epaisseur_mm":null,"lambda":null,"acermi":null
    },
    {
      "reference":"ISOVER-IBR-NU-300-R750","aliases":["ISOVER-IBR-NU-300-R750","ISOVER-IBR-NU-300"],
      "nom":"Rouleau de laine de verre Isover IBR nu — 300 mm, R 7,50",
      "marque":"Isover","description":"Rouleau de laine de verre nu pour isolation des combles perdus. Épaisseur nominale : 300 mm ; résistance thermique déclarée : R = 7,50 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier les données de la fiche technique correspondant à la référence livrée.",
      "prix":23.70,"pose":"déroulage","type":"Laine de verre en rouleaux — nu","r":7.5,"epaisseur_mm":300,"lambda":0.040,"acermi":null
    },
    {
      "reference":"ISOVER-IBR-KRAFT-300-R750","aliases":["ISOVER-IBR-KRAFT-300-R750","ISOVER-IBR-KRAFT-300"],
      "nom":"Rouleau de laine de verre Isover IBR kraft — 300 mm, R 7,50",
      "marque":"Isover","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 300 mm ; résistance thermique déclarée : R = 7,50 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Le parement kraft ne dispense pas de vérifier les règles de gestion de la vapeur d’eau applicables au plancher et au bâtiment.",
      "prix":20.85,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":7.5,"epaisseur_mm":300,"lambda":0.040,"acermi":null
    },
    {
      "reference":"ISOVER-IBR-KRAFT-400-R1000","aliases":["ISOVER-IBR-KRAFT-400-R1000","ISOVER-IBR-KRAFT-400"],
      "nom":"Rouleau de laine de verre Isover IBR kraft — 400 mm, R 10,00",
      "marque":"Isover","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 400 mm ; résistance thermique déclarée : R = 10,00 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier les prescriptions fabricant et les conditions de pose sur le support existant.",
      "prix":30.00,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":10,"epaisseur_mm":400,"lambda":0.040,"acermi":null
    },
    {
      "reference":"ROCKWOOL-JETROCK2-R7","aliases":["ROCKWOOL-JETROCK2-R7","ROCKWOOL-JETROCK2-20KG"],
      "nom":"Laine de roche à souffler Rockwool Jetrock 2 — R 7",
      "marque":"Rockwool","description":"Laine de roche en vrac destinée à l’isolation des combles perdus par soufflage. Pour R = 7 m²·K/W : consommation indicative communiquée de 29,6 sacs de 20 kg pour 100 m². Conductivité thermique déclarée : λ = 0,044 W/(m·K). La consommation doit être ajustée à la surface et aux prescriptions de la documentation applicable.",
      "prix":17.23,"pose":"soufflage","type":"Laine de roche en vrac — soufflage","r":7,"epaisseur_mm":null,"lambda":0.044,"acermi":"17/D/015/1195"
    },
    {
      "reference":"URSA-MRK35-KRAFT-280-R800","aliases":["URSA-MRK35-KRAFT-280-R800","URSA-MRK35-280"],
      "nom":"Rouleau de laine de verre URSA MRK 35 kraft — 280 mm, R 8,00",
      "marque":"URSA","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 280 mm ; résistance thermique déclarée : R = 8,00 m²·K/W ; conductivité thermique déclarée : λ = 0,035 W/(m·K). Vérifier la référence et les caractéristiques sur la fiche fabricant du produit livré.",
      "prix":31.55,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":8,"epaisseur_mm":280,"lambda":0.035,"acermi":null
    },
    {
      "reference":"URSA-MRK40-KRAFT-300-R750","aliases":["URSA-MRK40-KRAFT-300-R750","URSA-MRK40-300"],
      "nom":"Rouleau de laine de verre URSA MRK 40 kraft — 300 mm, R 7,50",
      "marque":"URSA","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 300 mm ; résistance thermique déclarée : R = 7,50 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier la référence et les caractéristiques sur la fiche fabricant du produit livré.",
      "prix":19.90,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":7.5,"epaisseur_mm":300,"lambda":0.040,"acermi":null
    },
    {
      "reference":"URSA-PULSR47-R7","aliases":["URSA-PULSR47-R7","URSA-PULSR47-16-6KG"],
      "nom":"Laine de verre à souffler URSA Puls’R 47 — R 7",
      "marque":"URSA","description":"Laine minérale en vrac destinée à l’isolation des combles perdus par soufflage. Pour R = 7 m²·K/W : consommation indicative communiquée de 21 sacs de 16,6 kg pour 100 m². Conductivité thermique déclarée : λ = 0,047 W/(m·K). Vérifier la référence exacte, l’épaisseur et la masse mise en œuvre dans la documentation fabricant applicable.",
      "prix":19.85,"pose":"soufflage","type":"Laine minérale en vrac — soufflage","r":7,"epaisseur_mm":null,"lambda":0.047,"acermi":"14/D/058/950"
    },
    {
      "reference":"ISOLATION_COMBLES_PERDUS_THERMO_LOFT_S","aliases":["ISOLATION_COMBLES_PERDUS_THERMO_LOFT_S"],
      "nom":"Isolation combles perdus — Knauf Insulation Thermo Loft — soufflage R mini 7",
      "marque":"Knauf Insulation","description":"Prestation/produit d’isolation des combles perdus par soufflage avec Thermo Loft, résistance thermique visée R ≥ 7 m²·K/W. Cette entrée catalogue est distincte de la référence conditionnée en sacs ; confirmer la composition du prix et la référence technique avant émission du devis.",
      "prix":35.00,"pose":"soufflage","type":"Offre Thermo Loft — soufflage","r":7,"epaisseur_mm":null,"lambda":null,"acermi":null
    },
    {
      "reference":"KNAUF-THERMOLOFT-R7","aliases":["KNAUF-THERMOLOFT-R7","KNAUFINS-THERMO-LOFT-16-6KG"],
      "nom":"Laine de verre à souffler Knauf Insulation Thermo Loft — R 7",
      "marque":"Knauf Insulation","description":"Laine de verre en vrac destinée à l’isolation des combles perdus par soufflage. Pour R = 7 m²·K/W : consommation indicative communiquée de 23 sacs de 16,6 kg pour 100 m². Conductivité thermique déclarée : λ = 0,045 W/(m·K). Vérifier la fiche technique et la consommation de référence applicables au produit livré.",
      "prix":11.73,"pose":"soufflage","type":"Laine de verre en vrac — soufflage","r":7,"epaisseur_mm":null,"lambda":0.045,"acermi":"13/D/016/850"
    },
    {
      "reference":"KNAUF-TI212-KRAFT-280-R700","aliases":["KNAUF-TI212-KRAFT-280-R700","KNAUFINS-TI212-280"],
      "nom":"Rouleau de laine de verre Knauf Insulation TI 212 kraft — 280 mm, R 7,00",
      "marque":"Knauf Insulation","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 280 mm ; résistance thermique déclarée : R = 7,00 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier la fiche fabricant et les règles de pose applicables au support.",
      "prix":25.60,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":7,"epaisseur_mm":280,"lambda":0.040,"acermi":null
    },
    {
      "reference":"KNAUF-TI212-KRAFT-300-R750","aliases":["KNAUF-TI212-KRAFT-300-R750","KNAUFINS-TI212-300"],
      "nom":"Rouleau de laine de verre Knauf Insulation TI 212 kraft — 300 mm, R 7,50",
      "marque":"Knauf Insulation","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 300 mm ; résistance thermique déclarée : R = 7,50 m²·K/W ; conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier la fiche fabricant et les règles de pose applicables au support.",
      "prix":18.75,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":7.5,"epaisseur_mm":300,"lambda":0.040,"acermi":null
    },
    {
      "reference":"KNAUF-TI216-KRAFT-370-R1000","aliases":["KNAUF-TI216-KRAFT-370-R1000","KNAUFINS-TI216-370"],
      "nom":"Rouleau de laine de verre Knauf Insulation TI 216 kraft — 370 mm, R 10,00",
      "marque":"Knauf Insulation","description":"Rouleau de laine de verre avec parement kraft pour isolation des combles perdus. Épaisseur nominale : 370 mm ; résistance thermique déclarée : R = 10,00 m²·K/W ; conductivité thermique déclarée : λ = 0,037 W/(m·K). Vérifier la fiche fabricant et les règles de pose applicables au support.",
      "prix":24.25,"pose":"déroulage","type":"Laine de verre en rouleaux — parement kraft","r":10,"epaisseur_mm":370,"lambda":0.037,"acermi":null
    },
    {
      "reference":"SOPREMA-UNIVERCELL-CRISTAL-R7","aliases":["SOPREMA-UNIVERCELL-CRISTAL-R7","SOPREMA-UNIVERCELL-CRISTAL-12-5KG"],
      "nom":"Ouate de cellulose à souffler Soprema Univercell Cristal — R 7",
      "marque":"Soprema","description":"Ouate de cellulose en vrac destinée à l’isolation des combles perdus par soufflage. Pour R = 7 m²·K/W : consommation indicative communiquée de 56 sacs de 12,5 kg pour 100 m². Conductivité thermique déclarée : λ = 0,040 W/(m·K). Vérifier la référence exacte et les prescriptions de mise en œuvre fabricant.",
      "prix":10.36,"pose":"soufflage","type":"Ouate de cellulose en vrac — soufflage","r":7,"epaisseur_mm":null,"lambda":0.040,"acermi":"22/D/141/1569"
    }
  ]
  $products$::jsonb) LOOP
    v_r := NULLIF(p->>'r','')::numeric;
    v_pose := CASE WHEN p->>'pose' = 'soufflage' THEN 16.00 ELSE 18.00 END;
    v_eligible_cee := (v_r IS NOT NULL AND v_r >= 7);

    SELECT id, reference INTO v_id, v_reference_existante
    FROM catalogue_produits
    WHERE entreprise_id = v_entreprise
      AND reference = ANY (ARRAY(SELECT jsonb_array_elements_text(p->'aliases')))
    ORDER BY CASE WHEN reference = p->>'reference' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO catalogue_produits (
        entreprise_id, categorie, nom, marque, reference, description, caracteristiques,
        prix_unitaire_ht, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee, actif,
        public_cible, catalogue_groupe, forfait_pose_ht, forfait_evacuation_ht
      ) VALUES (
        v_entreprise, 'combles_perdus', p->>'nom', p->>'marque', p->>'reference', p->>'description',
        jsonb_strip_nulls(jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',v_r,
          'epaisseur_mm',NULLIF(p->>'epaisseur_mm','')::numeric,
          'conductivite_thermique_lambda_W_mK',NULLIF(p->>'lambda','')::numeric,
          'certificat_acermi',NULLIF(p->>'acermi',''),
          'mode_pose',p->>'pose',
          'fiche_cee_a_verifier',CASE WHEN v_eligible_cee THEN 'BAR-EN-101' ELSE NULL END
        )),
        (p->>'prix')::numeric, 'm2', 5.5, false, v_eligible_cee,
        CASE WHEN v_eligible_cee THEN 'BAR-EN-101' ELSE '' END, true,
        'particulier', 'particulier', v_pose, 0
      );
    ELSE
      UPDATE catalogue_produits SET
        categorie = 'combles_perdus',
        nom = p->>'nom',
        marque = p->>'marque',
        description = p->>'description',
        prix_unitaire_ht = (p->>'prix')::numeric,
        unite = 'm2',
        tva_taux = 5.5,
        forfait_pose_ht = v_pose,
        eligible_cee = v_eligible_cee,
        fiche_cee = CASE WHEN v_eligible_cee THEN 'BAR-EN-101' ELSE '' END,
        actif = true,
        public_cible = 'particulier',
        catalogue_groupe = 'particulier',
        caracteristiques = (COALESCE(caracteristiques, '{}'::jsonb) - 'prix_source' - 'note_tarif' - 'pose_incluse' - 'prix_fourniture_source' - 'prix_fourniture_ht_m2' - 'forfait_pose_ht_m2') || jsonb_strip_nulls(jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',v_r,
          'epaisseur_mm',NULLIF(p->>'epaisseur_mm','')::numeric,
          'conductivite_thermique_lambda_W_mK',NULLIF(p->>'lambda','')::numeric,
          'certificat_acermi',NULLIF(p->>'acermi',''),
          'mode_pose',p->>'pose',
          'fiche_cee_a_verifier',CASE WHEN v_eligible_cee THEN 'BAR-EN-101' ELSE NULL END
        ))
      WHERE id = v_id;
    END IF;
    v_id := NULL;
    v_reference_existante := NULL;
  END LOOP;
END $$;

-- Les forfaits d'évacuation restent inchangés : aucun prix ne nous a été communiqué pour ce poste.
