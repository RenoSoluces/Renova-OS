-- Reno Soluces — descriptions de devis détaillées pour les 16 références « Combles perdus ».
-- Format basé sur le devis exemple fourni : identification produit, caractéristiques disponibles,
-- puis consignes de mise en œuvre. La surface reste liée au métrage du chantier.
-- Les caractéristiques non communiquées ne sont pas inventées ; les prix, poses, aides et évacuations ne sont pas modifiés.

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_refs text[];
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : descriptions combles perdus non mises à jour.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
[
  {
    "reference": "COMBLES-PULSR-FORFAIT",
    "aliases": [
      "COMBLES-PULSR-FORFAIT",
      "PULSR"
    ],
    "nom": "PULSR — isolation des combles perdus par soufflage",
    "description": "Réf. : PULSR\nMarque : URSA\nGamme : Puls’R 47\nType : Laine de verre à souffler\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nConductivité thermique λ : 0,047 W/(m·K)\nCertificat ACERMI : 14/D/058/950\nRésistance thermique visée : R = 7 m²·K/W pour la référence R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus, à l’épaisseur correspondant à la résistance thermique retenue. Repérage et protection des points électriques et éclairages encastrés. Traitement de la trappe d’accès et de son isolation, mise en place des piges de repérage et maintien des écarts au feu autour des conduits conformément aux prescriptions applicables. Vérification de la ventilation en périphérie et des équipements présents avant soufflage. Les dispositions relatives au pare-vapeur et aux coffrages de VMC sont à déterminer selon la configuration réelle du comble."
  },
  {
    "reference": "ISOVER-COMBLISSIMO-R7",
    "aliases": [
      "ISOVER-COMBLISSIMO-R7",
      "ISOVER-COMBLISSIMO"
    ],
    "nom": "Laine de verre à souffler Isover Comblissimo — R 7",
    "description": "Réf. : ISOVER-COMBLISSIMO\nMarque : Isover\nGamme : Comblissimo\nType : Laine de verre en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique : R = 7 m²·K/W pour la mise en œuvre indiquée\nConductivité thermique λ : 0,046 W/(m·K)\nCertificat ACERMI : 07/D/18/474\nConsommation indicative communiquée : 21,8 sacs de 17,3 kg pour 100 m² à R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus. Répartition homogène de l’isolant à l’épaisseur prescrite. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification des dispositions de ventilation en périphérie. Les dispositions relatives au pare-vapeur et aux équipements présents sont déterminées selon la configuration du chantier et les prescriptions fabricant."
  },
  {
    "reference": "VOLCALIS-EASY-LAINE-MINERALE",
    "aliases": [
      "VOLCALIS-EASY-LAINE-MINERALE",
      "1_DEROULE_EASY_LAINE_MINERALE_ISOLATIO"
    ],
    "nom": "Déroulé EASY Volcalis — laine minérale pour combles perdus",
    "description": "Réf. : 1.Déroulé EASY Laine Minérale\nMarque : Volcalis\nGamme : EASY\nType : Laine minérale en rouleaux, pose par déroulage\nÉpaisseur : selon la référence livrée\nSurface : selon métrage du chantier\nRésistance thermique : à reprendre depuis la fiche technique de la référence effectivement fournie\nConductivité thermique λ : à reprendre depuis la fiche technique de la référence effectivement fournie\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec pose jointive des lés et découpe ajustée autour des éléments traversants. Vérification préalable de l’état du support, de la ventilation du comble et des écarts au feu autour des conduits. Le traitement de la trappe d’accès, des points électriques et des équipements présents est réalisé selon la configuration du chantier et les prescriptions fabricant."
  },
  {
    "reference": "ISOVER-IBR-NU-300-R750",
    "aliases": [
      "ISOVER-IBR-NU-300-R750",
      "ISOVER-IBR-NU-300"
    ],
    "nom": "Rouleau de laine de verre Isover IBR nu — 300 mm, R 7,50",
    "description": "Réf. : ISOVER-IBR-NU-300\nMarque : Isover\nGamme : IBR nu\nType : Laine de verre en rouleau sans parement\nÉpaisseur : 300 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 7,50 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, en lés jointifs et sans compression de l’isolant. Découpes ajustées autour des éléments traversants et raccordement soigné aux rives. Vérification préalable de la ventilation, des écarts au feu et de l’accessibilité de la trappe. Les éventuelles couches complémentaires et dispositions de gestion de la vapeur d’eau sont définies selon la composition du plancher et les prescriptions fabricant."
  },
  {
    "reference": "ISOVER-IBR-KRAFT-300-R750",
    "aliases": [
      "ISOVER-IBR-KRAFT-300-R750",
      "ISOVER-IBR-KRAFT-300"
    ],
    "nom": "Rouleau de laine de verre Isover IBR kraft — 300 mm, R 7,50",
    "description": "Réf. : ISOVER-IBR-KRAFT-300\nMarque : Isover\nGamme : IBR revêtu kraft\nType : Laine de verre en rouleau avec parement kraft\nÉpaisseur : 300 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 7,50 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs et découpes ajustées. Le parement kraft est orienté conformément aux prescriptions fabricant et à la composition du plancher ; il ne constitue pas à lui seul une justification du traitement de la vapeur d’eau. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation avant pose."
  },
  {
    "reference": "ISOVER-IBR-KRAFT-400-R1000",
    "aliases": [
      "ISOVER-IBR-KRAFT-400-R1000",
      "ISOVER-IBR-KRAFT-400"
    ],
    "nom": "Rouleau de laine de verre Isover IBR kraft — 400 mm, R 10,00",
    "description": "Réf. : ISOVER-IBR-KRAFT-400\nMarque : Isover\nGamme : IBR revêtu kraft\nType : Laine de verre en rouleau avec parement kraft\nÉpaisseur : 400 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 10,00 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs, découpes ajustées et maintien de l’épaisseur nominale sans compression. Le sens du parement kraft et les dispositions de gestion de la vapeur d’eau sont déterminés selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des équipements électriques, de la trappe d’accès et de la ventilation du comble."
  },
  {
    "reference": "ROCKWOOL-JETROCK2-R7",
    "aliases": [
      "ROCKWOOL-JETROCK2-R7",
      "ROCKWOOL-JETROCK2-20KG"
    ],
    "nom": "Laine de roche à souffler Rockwool Jetrock 2 — R 7",
    "description": "Réf. : ROCKWOOL-JETROCK2-20KG\nMarque : Rockwool\nGamme : Jetrock 2\nType : Laine de roche en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique : R = 7 m²·K/W pour la mise en œuvre indiquée\nConductivité thermique λ : 0,044 W/(m·K)\nCertificat ACERMI : 17/D/015/1195\nConsommation indicative communiquée : 29,6 sacs de 20 kg pour 100 m² à R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus, avec répartition homogène de l’isolant à l’épaisseur prescrite. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification de la ventilation en périphérie. Les dispositions relatives au pare-vapeur et aux coffrages d’équipements sont déterminées selon le chantier et les prescriptions fabricant."
  },
  {
    "reference": "URSA-MRK35-KRAFT-280-R800",
    "aliases": [
      "URSA-MRK35-KRAFT-280-R800",
      "URSA-MRK35-280"
    ],
    "nom": "Rouleau de laine minérale URSA MRK 35 kraft — 280 mm, R 8,00",
    "description": "Réf. : URSA-MRK35-280\nMarque : URSA\nGamme : MRK 35\nType : Laine minérale en rouleau avec parement kraft\nÉpaisseur : 280 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 8,00 m²·K/W\nConductivité thermique λ : 0,035 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs, découpes ajustées et maintien de l’épaisseur nominale sans compression. Le parement kraft est positionné selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation du comble avant pose."
  },
  {
    "reference": "URSA-MRK40-KRAFT-300-R750",
    "aliases": [
      "URSA-MRK40-KRAFT-300-R750",
      "URSA-MRK40-300"
    ],
    "nom": "Rouleau de laine minérale URSA MRK 40 kraft — 300 mm, R 7,50",
    "description": "Réf. : URSA-MRK40-300\nMarque : URSA\nGamme : MRK 40\nType : Laine minérale en rouleau avec parement kraft\nÉpaisseur : 300 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 7,50 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs et découpes ajustées autour des éléments traversants. Le parement kraft est positionné selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation avant pose."
  },
  {
    "reference": "URSA-PULSR47-R7",
    "aliases": [
      "URSA-PULSR47-R7",
      "URSA-PULSR47-16-6KG"
    ],
    "nom": "Laine de verre à souffler URSA Puls’R 47 — R 7",
    "description": "Réf. : URSA-PULSR47-16-6KG\nMarque : URSA\nGamme : Puls’R 47\nType : Laine de verre en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique : R = 7 m²·K/W pour la mise en œuvre indiquée\nConductivité thermique λ : 0,047 W/(m·K)\nCertificat ACERMI : 14/D/058/950\nConsommation indicative communiquée : 21 sacs de 16,6 kg pour 100 m² à R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus, à l’épaisseur correspondant à la résistance thermique retenue. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification de la ventilation en périphérie. Les dispositions relatives au pare-vapeur et aux équipements présents sont déterminées selon la configuration du chantier et les prescriptions fabricant."
  },
  {
    "reference": "ISOLATION_COMBLES_PERDUS_THERMO_LOFT_S",
    "aliases": [
      "ISOLATION_COMBLES_PERDUS_THERMO_LOFT_S"
    ],
    "nom": "Knauf Insulation Thermo Loft — isolation des combles perdus par soufflage",
    "description": "Réf. : ISOLATION_COMBLES_PERDUS_THERMO_LOFT_S\nMarque : Knauf Insulation\nGamme : Thermo Loft\nType : Laine minérale en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique visée : R ≥ 7 m²·K/W, à confirmer selon la référence et l’épaisseur réellement mises en œuvre\n\nPrestation d’isolation des combles perdus par soufflage mécanique. Répartition homogène de l’isolant à l’épaisseur prescrite. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification de la ventilation en périphérie. Cette entrée catalogue reste distincte de la référence Thermo Loft conditionnée en sacs ; la référence fabricant et les caractéristiques définitives doivent correspondre au produit réellement livré."
  },
  {
    "reference": "KNAUF-THERMOLOFT-R7",
    "aliases": [
      "KNAUF-THERMOLOFT-R7",
      "KNAUFINS-THERMO-LOFT-16-6KG"
    ],
    "nom": "Laine de verre à souffler Knauf Insulation Thermo Loft — R 7",
    "description": "Réf. : KNAUFINS-THERMO-LOFT-16-6KG\nMarque : Knauf Insulation\nGamme : Thermo Loft\nType : Laine de verre en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique : R = 7 m²·K/W pour la mise en œuvre indiquée\nConductivité thermique λ : 0,045 W/(m·K)\nCertificat ACERMI : 13/D/016/850\nConsommation indicative communiquée : 23 sacs de 16,6 kg pour 100 m² à R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus, à l’épaisseur prescrite pour atteindre la résistance thermique retenue. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification de la ventilation en périphérie. Les dispositions relatives au pare-vapeur et aux équipements présents sont déterminées selon le chantier et les prescriptions fabricant."
  },
  {
    "reference": "KNAUF-TI212-KRAFT-280-R700",
    "aliases": [
      "KNAUF-TI212-KRAFT-280-R700",
      "KNAUFINS-TI212-280"
    ],
    "nom": "Rouleau de laine de verre Knauf Insulation TI 212 kraft — 280 mm, R 7,00",
    "description": "Réf. : KNAUFINS-TI212-280\nMarque : Knauf Insulation\nGamme : TI 212\nType : Laine de verre en rouleau avec parement kraft\nÉpaisseur : 280 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 7,00 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs, découpes ajustées et maintien de l’épaisseur nominale sans compression. Le parement kraft est positionné selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation du comble avant pose."
  },
  {
    "reference": "KNAUF-TI212-KRAFT-300-R750",
    "aliases": [
      "KNAUF-TI212-KRAFT-300-R750",
      "KNAUFINS-TI212-300"
    ],
    "nom": "Rouleau de laine de verre Knauf Insulation TI 212 kraft — 300 mm, R 7,50",
    "description": "Réf. : KNAUFINS-TI212-300\nMarque : Knauf Insulation\nGamme : TI 212\nType : Laine de verre en rouleau avec parement kraft\nÉpaisseur : 300 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 7,50 m²·K/W\nConductivité thermique λ : 0,040 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs et découpes ajustées autour des éléments traversants. Le parement kraft est positionné selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation avant pose."
  },
  {
    "reference": "KNAUF-TI216-KRAFT-370-R1000",
    "aliases": [
      "KNAUF-TI216-KRAFT-370-R1000",
      "KNAUFINS-TI216-370"
    ],
    "nom": "Rouleau de laine de verre Knauf Insulation TI 216 kraft — 370 mm, R 10,00",
    "description": "Réf. : KNAUFINS-TI216-370\nMarque : Knauf Insulation\nGamme : TI 216\nType : Laine de verre en rouleau avec parement kraft\nÉpaisseur : 370 mm\nSurface : selon métrage du chantier\nRésistance thermique : R = 10,00 m²·K/W\nConductivité thermique λ : 0,037 W/(m·K)\n\nMise en œuvre par déroulage sur le plancher des combles perdus, avec lés jointifs, découpes ajustées et maintien de l’épaisseur nominale sans compression. Le parement kraft est positionné selon les prescriptions fabricant et la composition du plancher. Vérification des écarts au feu, des points électriques, de la trappe d’accès et de la ventilation avant pose."
  },
  {
    "reference": "SOPREMA-UNIVERCELL-CRISTAL-R7",
    "aliases": [
      "SOPREMA-UNIVERCELL-CRISTAL-R7",
      "SOPREMA-UNIVERCELL-CRISTAL-12-5KG"
    ],
    "nom": "Ouate de cellulose à souffler Soprema Univercell Cristal — R 7",
    "description": "Réf. : SOPREMA-UNIVERCELL-CRISTAL-12-5KG\nMarque : Soprema\nGamme : Univercell Cristal\nType : Ouate de cellulose en vrac pour soufflage\nÉpaisseur : selon résistance thermique visée et prescriptions fabricant\nSurface : selon métrage du chantier\nRésistance thermique : R = 7 m²·K/W pour la mise en œuvre indiquée\nConductivité thermique λ : 0,040 W/(m·K)\nCertificat ACERMI : 22/D/141/1569\nConsommation indicative communiquée : 56 sacs de 12,5 kg pour 100 m² à R 7\n\nMise en œuvre par soufflage mécanique sur plancher de combles perdus, avec répartition homogène de l’isolant à l’épaisseur prescrite. Repérage et protection des points électriques et éclairages encastrés, traitement de la trappe d’accès et maintien des écarts au feu autour des conduits. Pose de piges de repérage et vérification de la ventilation en périphérie. Les dispositions relatives au pare-vapeur et aux équipements présents sont déterminées selon la configuration du chantier et les prescriptions fabricant."
  }
]
  $products$::jsonb) LOOP
    SELECT array_agg(value) INTO v_refs FROM jsonb_array_elements_text(p->'aliases');
    UPDATE catalogue_produits
    SET nom = p->>'nom', description = p->>'description'
    WHERE entreprise_id = v_entreprise AND reference = ANY(v_refs);
    v_refs := NULL;
  END LOOP;
END $$;
