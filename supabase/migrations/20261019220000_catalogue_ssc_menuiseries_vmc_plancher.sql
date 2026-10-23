-- Catalogue complémentaire Renova OS — SSC, solaire thermique, plancher bas, menuiseries et VMC.
-- Tarifs communiqués par Reno Soluces le 19/10/2026. Les primes et taux de TVA doivent être
-- confirmés selon le dossier, les critères techniques, le professionnel et la réglementation en vigueur.
-- Migration idempotente : mise à jour par référence au lieu de créer des doublons.

ALTER TABLE public.catalogue_produits ADD COLUMN IF NOT EXISTS public_cible text NOT NULL DEFAULT 'particulier';

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : aucun produit complémentaire inséré.';
    RETURN;
  END IF;
  FOR p IN SELECT value FROM jsonb_array_elements($products$
[
  {
    "categorie": "plancher",
    "reference": "EFISOL-TMS-68",
    "nom": "Soprema Efisol TMS — 68 mm (R=3,15)",
    "marque": "Soprema",
    "prix_ht": 15.7,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.15,
      "type_isolant": "PU",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "HIRSCH-GRAPHIPAN-CEE103-100",
    "nom": "Hirsch Graphipan CEE 103 Igni — 100 mm (R=3,15)",
    "marque": "Hirsch",
    "prix_ht": 40,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.15,
      "type_isolant": "PSE",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "KNAUF-THANE-SOL-80",
    "nom": "Knauf Thane Sol — 80 mm (R=3,70)",
    "marque": "Knauf",
    "prix_ht": 24.5,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.7,
      "type_isolant": "PU",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "KNAUF-XTHERM-RENO-SE-96",
    "nom": "Knauf XTherm Réno SE — 96 mm (R=3,00)",
    "marque": "Knauf",
    "prix_ht": 30.55,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.0,
      "type_isolant": "PSE",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "SINIAT-UNIMAT-TH32-IGN-100",
    "nom": "Siniat Unimat TH32 IGN — 100 mm (R=3,10)",
    "marque": "Siniat",
    "prix_ht": 21.35,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.1,
      "type_isolant": "PSE",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "SINIAT-UNIMAT-TH38-IGN-130",
    "nom": "Siniat Unimat TH38 IGN — 130 mm (R=3,40)",
    "marque": "Siniat",
    "prix_ht": 26,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.4,
      "type_isolant": "PSE",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "URSA-RENOSOUDAL-ALU-96",
    "nom": "URSA Renosoudal Alu — 96 mm (R=3,00)",
    "marque": "URSA",
    "prix_ht": 40.35,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3,
      "type_isolant": "Laine de roche/verre",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "ROCKWOOL-ROCKFEU-THERM-RSD-100",
    "nom": "Rockwool Rockfeu Therm RsD — 100 mm (R=3,00)",
    "marque": "Rockwool",
    "prix_ht": 19.19,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3,
      "type_isolant": "Laine de roche",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "KNAUF-SOUDALLE-ALU-100",
    "nom": "Knauf Insulation Soudalle Alu — 100 mm (R=3,15)",
    "marque": "Knauf Insulation",
    "prix_ht": 31.7,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3.15,
      "type_isolant": "Laine minérale",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "ROCKWOOL-SOUFACE-ALU-102",
    "nom": "Rockwool Souface Alu — 102 mm (R=3,00)",
    "marque": "Rockwool",
    "prix_ht": 15.95,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3,
      "type_isolant": "Laine de roche",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "KNAUF-TI312-ALU-240",
    "nom": "Knauf Insulation TI 312 Alu — 240 mm (R=6,00)",
    "marque": "Knauf Insulation",
    "prix_ht": 17,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 6,
      "type_isolant": "Laine minérale",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "KNAUF-TI312-KRAFT-ALU-120",
    "nom": "Knauf Insulation TI 312 Kraft Alu — 120 mm (R=3,00)",
    "marque": "Knauf Insulation",
    "prix_ht": 11.5,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-103",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Isolation thermique du plancher bas. Éligibilité CEE conditionnée aux critères de la fiche en vigueur et à la résistance thermique réellement justifiée.",
    "caracteristiques": {
      "resistance_thermique_R_m2K_W": 3,
      "type_isolant": "Laine minérale",
      "fiche_cee": "BAR-EN-103",
      "condition_cee": "R ≥ 3,00 m²·K/W à confirmer sur justificatif produit et fiche en vigueur",
      "prime_cee_estimation_eur_m2": {
        "bleu": 11,
        "jaune": 7,
        "violet": 7,
        "rose": 7
      },
      "prime_cee_indicative": true
    }
  },
  {
    "categorie": "plancher",
    "reference": "POSE-PLANCHER-SOUS-FACE",
    "nom": "Forfait pose plancher bas — sous-face garage / sous-sol",
    "marque": "Main-d’œuvre",
    "prix_ht": 30,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Forfait de pose sous-face par fixation mécanique ou collage.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "plancher",
    "reference": "POSE-PLANCHER-SOUS-CHAPE",
    "nom": "Forfait pose plancher bas — sous chape",
    "marque": "Main-d’œuvre",
    "prix_ht": 22,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Pose de panneaux isolants au sol avant coulage de chape.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "ssc",
    "reference": "SSC-PACK-F-4-PV",
    "nom": "SSC — PACK F — 4 PV",
    "marque": "Pack hybride",
    "prix_ht": 7450,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-143",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Système solaire combiné chauffage et eau chaude sanitaire. Aides indicatives uniquement : vérifier la version de la fiche CEE, la configuration, les conditions MaPrimeRénov’ et les règles en vigueur à la date du dossier.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-143",
      "volume_balloon_l": null,
      "configuration_capteurs": "4 capteurs hybrides",
      "aides_mpr_indicatives_eur": {
        "bleu": 10000,
        "jaune": 8000,
        "violet": 4000,
        "rose": 0
      },
      "cee_indicatif_eur": {
        "bleu": 5000,
        "jaune": 4000,
        "violet": 4000,
        "rose": 4000
      },
      "montants_aides_a_confirmer": true,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "ssc",
    "reference": "SSC-THERMADOR-ASTREA-ITHEON-480",
    "nom": "Système solaire combiné Thermador Astrea Pack Ithéon — 480 L, 4 capteurs",
    "marque": "Thermador",
    "prix_ht": 9200,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-143",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Système solaire combiné chauffage et eau chaude sanitaire. Aides indicatives uniquement : vérifier la version de la fiche CEE, la configuration, les conditions MaPrimeRénov’ et les règles en vigueur à la date du dossier.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-143",
      "volume_balloon_l": 480,
      "configuration_capteurs": "4 capteurs",
      "aides_mpr_indicatives_eur": {
        "bleu": 10000,
        "jaune": 8000,
        "violet": 4000,
        "rose": 0
      },
      "cee_indicatif_eur": {
        "bleu": 5000,
        "jaune": 4000,
        "violet": 4000,
        "rose": 4000
      },
      "montants_aides_a_confirmer": true,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "ssc",
    "reference": "SSC-CHAPPEE-WSC400",
    "nom": "Système solaire combiné Chappée SSC WSC 400 — 402 L, 4 capteurs",
    "marque": "Chappée",
    "prix_ht": 9972.4,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-143",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Système solaire combiné chauffage et eau chaude sanitaire. Aides indicatives uniquement : vérifier la version de la fiche CEE, la configuration, les conditions MaPrimeRénov’ et les règles en vigueur à la date du dossier.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-143",
      "volume_balloon_l": 402,
      "configuration_capteurs": "4 capteurs",
      "aides_mpr_indicatives_eur": {
        "bleu": 10000,
        "jaune": 8000,
        "violet": 4000,
        "rose": 0
      },
      "cee_indicatif_eur": {
        "bleu": 5000,
        "jaune": 4000,
        "violet": 4000,
        "rose": 4000
      },
      "montants_aides_a_confirmer": true,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "ssc",
    "reference": "SSC-ECOYA",
    "nom": "Système solaire combiné Ecoya",
    "marque": "Ecoya",
    "prix_ht": 11160,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-143",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Système solaire combiné chauffage et eau chaude sanitaire. Aides indicatives uniquement : vérifier la version de la fiche CEE, la configuration, les conditions MaPrimeRénov’ et les règles en vigueur à la date du dossier.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-143",
      "volume_balloon_l": null,
      "configuration_capteurs": "Configuration à confirmer sur fiche fabricant",
      "aides_mpr_indicatives_eur": {
        "bleu": 10000,
        "jaune": 8000,
        "violet": 4000,
        "rose": 0
      },
      "cee_indicatif_eur": {
        "bleu": 5000,
        "jaune": 4000,
        "violet": 4000,
        "rose": 4000
      },
      "montants_aides_a_confirmer": true,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "ssc",
    "reference": "SSC-DEDIETRICH-QUADRO700",
    "nom": "Système solaire combiné De Dietrich Dietrisol Quadro 700 — 780 L, 4 capteurs",
    "marque": "De Dietrich",
    "prix_ht": 12096.7,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-143",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Système solaire combiné chauffage et eau chaude sanitaire. Aides indicatives uniquement : vérifier la version de la fiche CEE, la configuration, les conditions MaPrimeRénov’ et les règles en vigueur à la date du dossier.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-143",
      "volume_balloon_l": 780,
      "configuration_capteurs": "4 capteurs",
      "aides_mpr_indicatives_eur": {
        "bleu": 10000,
        "jaune": 8000,
        "violet": 4000,
        "rose": 0
      },
      "cee_indicatif_eur": {
        "bleu": 5000,
        "jaune": 4000,
        "violet": 4000,
        "rose": 4000
      },
      "montants_aides_a_confirmer": true,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "ssc",
    "reference": "POSE-SSC-HYDRAULIQUE-TOITURE",
    "nom": "SSC — forfait pose et raccordement hydraulique / toiture",
    "marque": "Main-d’œuvre",
    "prix_ht": 3200,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Fixation des capteurs, passage des liaisons isolées, pose ballon et raccordement au chauffage.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "ssc",
    "reference": "POSE-SSC-MISE-SERVICE",
    "nom": "SSC — forfait mise en service, fluide et paramétrage",
    "marque": "Main-d’œuvre",
    "prix_ht": 450,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Remplissage glycol, mise sous pression et réglage de la régulation solaire.",
    "caracteristiques": {
      "type_prestation": "mise_en_service",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-BALLON-DD-INISOL-UNO-E200",
    "nom": "Ballon solaire De Dietrich Inisol Uno E 200 — 225 L, appoint électrique",
    "marque": "De Dietrich",
    "prix_ht": 2402,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 225,
      "appoint": "électrique"
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-BALLON-DD-INISOL-UNO-BSL300",
    "nom": "Ballon solaire De Dietrich Inisol Uno BSL 300 — 300 L, appoint hydraulique",
    "marque": "De Dietrich",
    "prix_ht": 2591,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 300,
      "appoint": "hydraulique"
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-BALLON-DD-INISOL-UNO-E400",
    "nom": "Ballon solaire De Dietrich Inisol Uno E 400 — 400 L, appoint électrique",
    "marque": "De Dietrich",
    "prix_ht": 4070,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 400,
      "appoint": "électrique"
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-PACK-DD-DH200-1CAP",
    "nom": "Pack De Dietrich 1 capteur DH200",
    "marque": "De Dietrich",
    "prix_ht": 1556,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "surface_capteurs_m2": 2,
      "nombre_capteurs": 1
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-PACK-DD-D230-2CAP",
    "nom": "Pack De Dietrich 2 capteurs D230",
    "marque": "De Dietrich",
    "prix_ht": 2616,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "surface_capteurs_m2": 5,
      "nombre_capteurs": 2
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-PACK-DD-DH200-3CAP",
    "nom": "Pack De Dietrich 3 capteurs DH200",
    "marque": "De Dietrich",
    "prix_ht": 4024,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "surface_capteurs_m2": 6,
      "nombre_capteurs": 3
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-GIORDANO-GIORSOL-ATV200",
    "nom": "Kit complet autovidange Giordano Giorsol ATV 200 — 200 L",
    "marque": "Giordano",
    "prix_ht": 2250,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 200,
      "type": "autovidange",
      "prix_estime": true
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-SAUNIER-HELIOS-250E",
    "nom": "Kit pressurisé Saunier Duval HelioSet 250 E — 252 L",
    "marque": "Saunier Duval",
    "prix_ht": 2950,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 252,
      "type": "pressurisé",
      "prix_estime": true
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "SOL-VIESSMANN-VITOSOL-141FM",
    "nom": "Kit prêt à poser Viessmann Vitosol 141-FM Surimp — 250 L + 2 capteurs",
    "marque": "Viessmann",
    "prix_ht": 4100,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-168",
    "eligible_cee": true,
    "eligible_mpr": true,
    "description": "Prix de fourniture seule communiqué. Vérifier la configuration et les critères de la fiche BAR-TH-168 en vigueur. Les aides sont estimatives et doivent être confirmées avant devis.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-168",
      "prix_fourniture_seule": true,
      "aides_a_confirmer": true,
      "volume_l": 250,
      "nombre_capteurs": 2,
      "prix_estime": true
    }
  },
  {
    "categorie": "solaire_thermique",
    "reference": "POSE-SOLAIRE-THERMIQUE",
    "nom": "Solaire thermique — forfait pose et raccordement",
    "marque": "Main-d’œuvre",
    "prix_ht": 2050,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Pose des rails, liaisons isolées, groupe de transfert, vase d’expansion et régulation.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALINE-PF-PVC-2V",
    "nom": "Porte-fenêtre ALINE 2 vantaux PVC",
    "marque": "ALINE",
    "prix_ht": 340,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-BARRIER-FEN-PVC-1V",
    "nom": "Fenêtre 1 vantail PVC Barrier",
    "marque": "Barrier",
    "prix_ht": 210,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-LORENOVE-ECRIN-PVC-2V",
    "nom": "Fenêtre PVC Lorenove Écrin 2 vantaux sur mesure",
    "marque": "Lorenove",
    "prix_ht": 480,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ARTFEN-HERMINE-PVC",
    "nom": "Fenêtre PVC Art & Fenêtres Hermine sur mesure",
    "marque": "Art & Fenêtres",
    "prix_ht": 495,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-RAUFIPRO-COMPOSITE",
    "nom": "Fenêtre composite Rau-Fipro Art & Fenêtres",
    "marque": "Art & Fenêtres",
    "prix_ht": 620,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PVC-2V-125118",
    "nom": "Fenêtre PVC GoodHome 2 vantaux — 125 × 118 cm",
    "marque": "GoodHome",
    "prix_ht": 170,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 125,
      "hauteur_cm": 118
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PF-PVC-140215",
    "nom": "Porte-fenêtre PVC GoodHome 2 vantaux — 140 × 215 cm",
    "marque": "GoodHome",
    "prix_ht": 295,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 140,
      "hauteur_cm": 215
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-TRYBA-PVC-BATTANTE",
    "nom": "Fenêtre battante PVC Tryba sur mesure",
    "marque": "Tryba",
    "prix_ht": 580,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-TRYBA-BOIS",
    "nom": "Fenêtre bois Tryba sur mesure",
    "marque": "Tryba",
    "prix_ht": 850,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-CHASSIS-FIXE-PVC-M2",
    "nom": "Châssis fixe PVC sur mesure",
    "marque": "Générique",
    "prix_ht": 450,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-F2V-M2",
    "nom": "Fenêtre PVC 2 vantaux (MEN-PVC-F2V)",
    "marque": "Générique",
    "prix_ht": 695,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-COULISSANT-ALU-RPT-M2",
    "nom": "Coulissant aluminium à rupture de pont thermique — grandes largeurs",
    "marque": "Générique",
    "prix_ht": 1305,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALU-F2V-M2",
    "nom": "Fenêtre aluminium RPT 2 vantaux (MEN-ALU-F2V)",
    "marque": "Générique",
    "prix_ht": 1042,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-MIXTE-BOIS-ALU-2V-M2",
    "nom": "Fenêtre mixte bois-aluminium 2 vantaux",
    "marque": "Générique",
    "prix_ht": 1668,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-VELUX-GGL-MK04-2076",
    "nom": "Velux GGL MK04 2076 Confort — 78 × 98 cm",
    "marque": "Velux",
    "prix_ht": 355,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 78,
      "hauteur_cm": 98
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTP-V-U3",
    "nom": "Fakro FTP-V U3 rotation — 78 × 98 cm",
    "marque": "Fakro",
    "prix_ht": 343,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 78,
      "hauteur_cm": 98
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-KEYLITE-TCP-04-T",
    "nom": "Keylite TCP-04-T Pin — 78 × 98 cm",
    "marque": "Keylite",
    "prix_ht": 315,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 78,
      "hauteur_cm": 98,
      "prix_estime": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ROTO-R7-PVC-7898",
    "nom": "Roto Designo R7 PVC — 78 × 98 cm",
    "marque": "Roto",
    "prix_ht": 634,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 78,
      "hauteur_cm": 98
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ROTO-R7-PVC-114118",
    "nom": "Roto Designo R7 PVC — 114 × 118 cm",
    "marque": "Roto",
    "prix_ht": 847,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 114,
      "hauteur_cm": 118
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTT-U8-114118",
    "nom": "Fakro FTT U8 Thermo quadruple vitrage — 114 × 118 cm",
    "marque": "Fakro",
    "prix_ht": 1766,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": "BAR-EN-104",
      "prime_cee_estimation_eur_unite": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "montants_indicatifs_a_confirmer": true,
      "largeur_cm": 114,
      "hauteur_cm": 118,
      "vitrage": "quadruple"
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-ENTREE-AIR-HYGRO",
    "nom": "Entrée d’air hygroréglable",
    "marque": "Accessoire",
    "prix_ht": 60,
    "unite": "unite",
    "tva": 10,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": null,
      "prime_cee_estimation_eur_unite": null,
      "montants_indicatifs_a_confirmer": true,
      "eligibilite_cee": false,
      "tva_a_verifier_selon_contexte": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-HABILLAGE-ML",
    "nom": "Habillage intérieur et couvre-joints",
    "marque": "Accessoire",
    "prix_ht": 28,
    "unite": "ml",
    "tva": 10,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": null,
      "prime_cee_estimation_eur_unite": null,
      "montants_indicatifs_a_confirmer": true,
      "eligibilite_cee": false,
      "tva_a_verifier_selon_contexte": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-APPUI-BAVETTE-ML",
    "nom": "Appui-bavette aluminium avec rejet d’eau",
    "marque": "Accessoire",
    "prix_ht": 100,
    "unite": "ml",
    "tva": 10,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Fourniture seule. Pour une prime CEE, contrôler les critères Uw/Sw et les autres exigences de la fiche BAR-EN-104 en vigueur. Accessoires seuls : non assimilés à un remplacement de menuiserie.",
    "caracteristiques": {
      "prix_fourniture_seule": true,
      "fiche_cee": null,
      "prime_cee_estimation_eur_unite": null,
      "montants_indicatifs_a_confirmer": true,
      "eligibilite_cee": false,
      "tva_a_verifier_selon_contexte": true
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "POSE-MENUISERIE-FENETRE-TOIT",
    "nom": "Forfait pose fenêtre / fenêtre de toit — 1 ou 2 vantaux",
    "marque": "Main-d’œuvre",
    "prix_ht": 250,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Forfait pose, à distinguer du prix de fourniture.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "POSE-MENUISERIE-PF-COULISSANT",
    "nom": "Forfait pose porte-fenêtre / coulissant",
    "marque": "Main-d’œuvre",
    "prix_ht": 350,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Forfait pose, à distinguer du prix de fourniture.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-HYGRO-A-INFINITY",
    "nom": "VMC simple flux hygroréglable HYGRO A Infinity",
    "marque": "Infinity",
    "prix_ht": 390,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "A"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-SIMPLEFLUX-HYGROB",
    "nom": "VMC simple flux hygroréglable type B générique",
    "marque": "Générique",
    "prix_ht": 450,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "B"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-SP-HYDRA-ST2",
    "nom": "Kit S&P HYDRA ST 2 — groupe + 3 bouches",
    "marque": "S&P",
    "prix_ht": 340,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-SP-HYDRA-ECOWATT2",
    "nom": "Kit S&P HYDRA ECOWATT 2+ basse consommation + 3 bouches",
    "marque": "S&P",
    "prix_ht": 415,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ATL-HYGROCOSY-GROUPE",
    "nom": "Atlantic Hygrocosy — groupe seul",
    "marque": "Atlantic",
    "prix_ht": 349.17,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ATL-HYGROCOSY-FLEX",
    "nom": "Kit Atlantic Hygrocosy Flex — groupe extra-plat + 3 bouches",
    "marque": "Atlantic",
    "prix_ht": 574.17,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX-PLUS-KIT",
    "nom": "Kit Atlantic Hygrocosy BC Flex + — groupe BC + 3 bouches",
    "marque": "Atlantic",
    "prix_ht": 400,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX",
    "nom": "Atlantic Hygrocosy BC Flex — groupe extra-plat seul",
    "marque": "Atlantic",
    "prix_ht": 555.83,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX-PLUS",
    "nom": "Atlantic Hygrocosy BC Flex + — groupe extra-plat seul",
    "marque": "Atlantic",
    "prix_ht": 567.5,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ALDES-EASYHOME-CLASSIC-BDH",
    "nom": "Aldes EasyHOME HYGRO Classic BDH — groupe seul",
    "marque": "Aldes",
    "prix_ht": 339,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ALDES-EASYHOME-CLASSIC-KIT",
    "nom": "Kit Aldes EasyHOME HYGRO Classic avec bouches BDH ELEC",
    "marque": "Aldes",
    "prix_ht": 511,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ALDES-EASYHOME-COMPACT-PREMIUM",
    "nom": "Aldes EasyHOME HYGRO COMPACT Premium MW BDH — groupe seul",
    "marque": "Aldes",
    "prix_ht": 494,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ALDES-EASYHOME-COMPACT-KIT",
    "nom": "Kit Aldes EasyHOME HYGRO COMPACT Premium MW avec bouches BDH ELEC",
    "marque": "Aldes",
    "prix_ht": 708,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-FRANCEAIR-HYGRA-RT4",
    "nom": "France Air Hygra RT Control 4 — caisson seul",
    "marque": "France Air",
    "prix_ht": 523,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-FRANCEAIR-HYGRA-RT4-COMPACT",
    "nom": "Kit France Air Hygra RT Control 4 Compact — caisson + 3 bouches",
    "marque": "France Air",
    "prix_ht": 1054,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-127",
      "prime_cee_estimation_eur": {
        "bleu": 500,
        "jaune": 160,
        "violet": 160,
        "rose": 160
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "simple",
      "type_hygro": "à confirmer"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-FRANCEAIR-DFX90",
    "nom": "VMC double flux France Air DFX 90 — rendement 90 %",
    "marque": "France Air",
    "prix_ht": 2310,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "rendement_pct": 90
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-FRANCEAIR-DFX-QAI",
    "nom": "VMC double flux France Air DFX QAI avec module QAI",
    "marque": "France Air",
    "prix_ht": 2705,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "module_qai": true
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-FRANCEAIR-COCOON20",
    "nom": "VMC double flux France Air Cocoon 20 — rendement 95 %",
    "marque": "France Air",
    "prix_ht": 3856,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "rendement_pct": 95
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-FRANCEAIR-COCOON50",
    "nom": "VMC double flux France Air Cocoon 50 — rendement 95 %",
    "marque": "France Air",
    "prix_ht": 5565,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "rendement_pct": 95
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-SP-DOMEO-EVO225-FL",
    "nom": "S&P DOMEO EVO 225 FL filaire — classe A",
    "marque": "S&P",
    "prix_ht": 1805,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-SP-DOMEO-EVO225-SERENITE",
    "nom": "S&P DOMEO EVO 225 SERENITE RD radio — classe A+",
    "marque": "S&P",
    "prix_ht": 2090,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A+"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-SP-DOMEO-EVO315-SERENITE",
    "nom": "S&P DOMEO EVO 315 SERENITE RD radio — classe A+",
    "marque": "S&P",
    "prix_ht": 2875,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A+"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-SP-DOMEO-EVO450-SERENITE",
    "nom": "S&P DOMEO EVO 450 SERENITE RD radio — classe A+",
    "marque": "S&P",
    "prix_ht": 4920,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A+"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-ALDES-INSPIRAIR300-PREM",
    "nom": "Aldes InspirAIR Top 300 Premium — classe A",
    "marque": "Aldes",
    "prix_ht": 4279,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DF-ALDES-INSPIRAIR300-ERV",
    "nom": "Aldes InspirAIR Top 300 ERV Premium — classe A",
    "marque": "Aldes",
    "prix_ht": 5589,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Fourniture seule. Éligibilité CEE sous réserve de confirmer les caractéristiques et les critères de la fiche en vigueur. Simple flux : seuls les systèmes hygroréglables éligibles sont retenus; autoréglable classique exclu.",
    "caracteristiques": {
      "fiche_cee": "BAR-TH-125",
      "prime_cee_estimation_eur": {
        "bleu": 600,
        "jaune": 350,
        "violet": 350,
        "rose": 350
      },
      "montants_indicatifs_a_confirmer": true,
      "prix_fourniture_seule": true,
      "type_flux": "double",
      "classe_energetique": "A"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-SF-HYGRO-B-POSEE",
    "nom": "VMC simple flux Hygro B — matériel + pose",
    "marque": "Offre combinée",
    "prix_ht": 1550,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-127",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Offre combinée matériel et pose; ne pas ajouter un second forfait de pose.",
    "caracteristiques": {
      "type_prestation": "materiel_et_pose",
      "prix_fourniture_incluse": true,
      "fiche_cee": "BAR-TH-127"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-DOUBLE-FLUX-POSEE",
    "nom": "VMC double flux haut rendement — matériel + pose",
    "marque": "Offre combinée",
    "prix_ht": 5200,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-125",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Offre combinée matériel et pose; ne pas ajouter un second forfait de pose.",
    "caracteristiques": {
      "type_prestation": "materiel_et_pose",
      "prix_fourniture_incluse": true,
      "fiche_cee": "BAR-TH-125"
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-SIMPLE-FLUX-GENERIQUE-POSEE",
    "nom": "VMC simple flux générique — matériel + pose",
    "marque": "Offre combinée",
    "prix_ht": 1895,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Offre combinée matériel et pose; fiche CEE à vérifier selon modèle hygroréglable.",
    "caracteristiques": {
      "type_prestation": "materiel_et_pose",
      "prix_fourniture_incluse": true,
      "fiche_cee": null
    }
  },
  {
    "categorie": "vmc",
    "reference": "POSE-VMC-SF-REMPLACEMENT",
    "nom": "Forfait pose VMC simple flux — remplacement caisson + bouches",
    "marque": "Main-d’œuvre",
    "prix_ht": 800,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Raccordement sur réseau de gaines existant sain.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "fiche_cee": null
    }
  },
  {
    "categorie": "vmc",
    "reference": "POSE-VMC-SF-RESEAU-COMPLET",
    "nom": "Forfait création réseau complet VMC simple flux",
    "marque": "Main-d’œuvre",
    "prix_ht": 1200,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Création de gaines neuves isolées vers 3 à 4 pièces humides.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "fiche_cee": null
    }
  },
  {
    "categorie": "vmc",
    "reference": "POSE-VMC-DF-RESEAU-COMPLET",
    "nom": "Forfait pose et création réseau complet VMC double flux",
    "marque": "Main-d’œuvre",
    "prix_ht": 3200,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Pose caisson, réseaux extraction et insufflation, équilibrage des débits.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "fiche_cee": null
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ACCESS-BOUCHE",
    "nom": "Remplacement bouche d’extraction ou entrée d’air",
    "marque": "Accessoire",
    "prix_ht": 90,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Remplacement d’une bouche ou entrée d’air.",
    "caracteristiques": {
      "type_prestation": "accessoire",
      "prix_fourniture_incluse": false,
      "fiche_cee": null
    }
  },
  {
    "categorie": "vmc",
    "reference": "VMC-ACCESS-GAINES-ML",
    "nom": "Réseau de gaines VMC isolées",
    "marque": "Accessoire",
    "prix_ht": 30,
    "unite": "ml",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Prix au mètre linéaire.",
    "caracteristiques": {
      "type_prestation": "accessoire",
      "prix_fourniture_incluse": false,
      "fiche_cee": null
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-SIDERALE-ALU",
    "nom": "Bel’M Sidérale Aluminium (Ud 0,68)",
    "marque": "Bel’M",
    "prix_ht": 4418.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 0.68
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-K5-FAKTORY-ALU",
    "nom": "Zilten K5-FAKTORY Aluminium (Ud 0,68)",
    "marque": "Zilten",
    "prix_ht": 4248.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 0.68
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-ALU-MONOBLOC-PORTE",
    "nom": "Tryba Aluminium Monobloc (sur mesure)",
    "marque": "Tryba",
    "prix_ht": 3100,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "KLINE-CELLA-PLEINE",
    "nom": "K•LINE Cella Pleine (sur mesure, Ud 0,68)",
    "marque": "K•LINE",
    "prix_ht": 2650,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 0.68
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "MEN-ALU-PORTE",
    "nom": "Porte d’entrée aluminium RPT générique sur mesure",
    "marque": "Générique",
    "prix_ht": 2500,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-COTIM-11-ALU",
    "nom": "Zilten COTIM 11 Aluminium (Ud 0,91)",
    "marque": "Zilten",
    "prix_ht": 2695,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 0.91
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "MEN-PVC-PORTE",
    "nom": "Porte d’entrée PVC générique sur mesure",
    "marque": "Générique",
    "prix_ht": 1808,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-EQUATION-68-ACIER",
    "nom": "Bel’M Équation 68+ Acier (Ud 0,75)",
    "marque": "Bel’M",
    "prix_ht": 1785.83,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 0.75
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-CYTISS-1-ALU",
    "nom": "Zilten CYTISS 1 Aluminium (Ud 1,1)",
    "marque": "Zilten",
    "prix_ht": 1768.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-EQUATION-ACIER",
    "nom": "Bel’M Équation Acier (Ud 1,1)",
    "marque": "Bel’M",
    "prix_ht": 1141.67,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "KLINE-BALANCINE-ALU",
    "nom": "K•LINE Balancine Aluminium (sur mesure, Ud 1,2)",
    "marque": "K•LINE",
    "prix_ht": 2150,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.2
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-SORBEY-ALU",
    "nom": "Lapeyre Sorbey Aluminium (Ud 1,1)",
    "marque": "Lapeyre",
    "prix_ht": 920,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "EGINa-GIMM-PVC",
    "nom": "Porte PVC EGINA Gimm Menuiseries",
    "marque": "Gimm Menuiseries",
    "prix_ht": 480,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-ARMANCE-2-PVC",
    "nom": "Lapeyre Armance 2 PVC (Ud 1,4)",
    "marque": "Lapeyre",
    "prix_ht": 520,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.4
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-PVC-PORTE",
    "nom": "Tryba PVC (sur mesure)",
    "marque": "Tryba",
    "prix_ht": 1450,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-TALMONT-BOIS",
    "nom": "Lapeyre Talmont Bois exotique (Ud 1,7)",
    "marque": "Lapeyre",
    "prix_ht": 575,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "Ud_W_m2K": 1.7
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-BOIS-PORTE",
    "nom": "Tryba Bois (sur mesure)",
    "marque": "Tryba",
    "prix_ht": 2100,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Éligibilité CEE et TVA à confirmer selon fiche officielle, performances certifiées et conditions de réalisation.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier les critères exacts de la fiche officielle en vigueur, le coefficient Ud justifié par la fiche fabricant et les conditions de pose avant de déclarer l’éligibilité.",
      "prime_cee_estimation_eur_par_equipement": {
        "bleu": 27.5,
        "jaune": 20,
        "violet": 20,
        "rose": 20
      },
      "prime_cee_indicative": true,
      "maprimerenov_geste_seul_eur": 0,
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "POSE-DEPOSE-TOTALE-PORTE-ENTREE",
    "nom": "Forfait dépose totale et pose d’une porte d’entrée",
    "marque": "Main-d’œuvre",
    "prix_ht": 380,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Forfait de main-d’œuvre : dépose, évacuation, pose, étanchéité périphérique et réglage. À distinguer du prix de fourniture.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "tva_indicative": 5.5
    }
  }
]
$products$::jsonb)
  LOOP
    SELECT id INTO v_id FROM public.catalogue_produits WHERE reference = p->>'reference' AND entreprise_id = v_entreprise LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,public_cible
      ) VALUES (
        v_entreprise,p->>'categorie',p->>'nom',COALESCE(p->>'marque',''),p->>'reference',
        COALESCE(p->>'description',''),COALESCE(p->'caracteristiques','{}'::jsonb),
        COALESCE((p->>'prix_ht')::numeric,0),COALESCE(p->>'unite','unite'),COALESCE((p->>'tva')::numeric,5.5),
        COALESCE((p->>'eligible_mpr')::boolean,false),COALESCE((p->>'eligible_cee')::boolean,false),
        COALESCE(p->>'fiche_cee',''),true,'particulier'
      );
    ELSE
      UPDATE public.catalogue_produits SET
        categorie=p->>'categorie',nom=p->>'nom',marque=COALESCE(p->>'marque',''),
        description=COALESCE(p->>'description',''),
        caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || COALESCE(p->'caracteristiques','{}'::jsonb),
        prix_unitaire_ht=COALESCE((p->>'prix_ht')::numeric,prix_unitaire_ht),
        unite=COALESCE(p->>'unite',unite),tva_taux=COALESCE((p->>'tva')::numeric,tva_taux),
        eligible_mpr=COALESCE((p->>'eligible_mpr')::boolean,false),
        eligible_cee=COALESCE((p->>'eligible_cee')::boolean,false),
        fiche_cee=COALESCE(p->>'fiche_cee',''),actif=true
      WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;

-- Corrige les associations des fiches ventilation selon les catégories fournies.
UPDATE public.catalogue_produits SET fiche_cee='BAR-TH-127', eligible_cee=true
WHERE categorie='vmc' AND (nom ILIKE '%hygroréglable%' OR nom ILIKE '%HYGRO%')
  AND (caracteristiques->>'type_flux'='simple' OR nom ILIKE '%simple flux%');
UPDATE public.catalogue_produits SET fiche_cee='BAR-TH-125', eligible_cee=true
WHERE categorie='vmc' AND (caracteristiques->>'type_flux'='double' OR nom ILIKE '%double flux%');
