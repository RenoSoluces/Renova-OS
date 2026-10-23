-- Mise à jour complémentaire catalogue : ballons thermodynamiques et menuiseries fenêtres (19/10/2026).
-- Prix de fourniture HT communiqués par Reno Soluces ; pose séparée et aides indicatives.
-- Les montants à chiffrer restent à 0 afin de ne pas injecter un tarif de pose arbitraire.
DO $$
DECLARE v_entreprise uuid; p jsonb; v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN RAISE NOTICE 'Aucune entreprise trouvée : aucun produit inséré.'; RETURN; END IF;
  FOR p IN SELECT value FROM jsonb_array_elements($products$
[
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-F-R290-100",
    "nom": "Clivet AQUA F R290 100 — 98 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 960,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 98,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-F-R290-190",
    "nom": "Clivet AQUA F R290 190 — 185 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1590,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 185,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-PLUS-SWAN2-190",
    "nom": "Clivet AQUA PLUS SWAN-2 190 — 176 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1640,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 176,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX-ACCESS-200",
    "nom": "Thermor Aéromax Access 200 L — classe A",
    "marque": "Thermor",
    "prix_ht": 1862,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": "A",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX-ACCESS-250",
    "nom": "Thermor Aéromax Access 250 L — classe A",
    "marque": "Thermor",
    "prix_ht": 1927,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 250,
      "classe_energetique": "A",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX6-VERTICAL-150",
    "nom": "Thermor Aéromax 6 Vertical 150 L",
    "marque": "Thermor",
    "prix_ht": 2057,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 150,
      "classe_energetique": null,
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-CONNECTE-150",
    "nom": "Atlantic Calypso Connecté 150 L — classe A+",
    "marque": "Atlantic",
    "prix_ht": 2077.73,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 150,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX6-VERTICAL-200",
    "nom": "Thermor Aéromax 6 Vertical 200 L — classe A+",
    "marque": "Thermor",
    "prix_ht": 2508,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-CONNECTE-200",
    "nom": "Atlantic Calypso Connecté 200 L — classe A+",
    "marque": "Atlantic",
    "prix_ht": 2528.91,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX6-VERTICAL-240",
    "nom": "Thermor Aéromax 6 Vertical 240 L",
    "marque": "Thermor",
    "prix_ht": 2604,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 240,
      "classe_energetique": null,
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-CONNECTE-240",
    "nom": "Atlantic Calypso Connecté 240 L — classe A+",
    "marque": "Atlantic",
    "prix_ht": 2624.64,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 240,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "DAIKIN-EKHHE200CV37",
    "nom": "Daikin Altherma M HW 200 L (EKHHE200CV37)",
    "marque": "Daikin",
    "prix_ht": 2646,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": null,
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-200",
    "nom": "Atlantic Calypso 200 L",
    "marque": "Atlantic",
    "prix_ht": 2860,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": null,
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "DAIKIN-EKHHE260CV37",
    "nom": "Daikin Altherma M HW 260 L (EKHHE260CV37)",
    "marque": "Daikin",
    "prix_ht": 2926,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 260,
      "classe_energetique": null,
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "BT200L-GENERIQUE",
    "nom": "Ballon thermodynamique générique BT 200 L / split",
    "marque": "Générique",
    "prix_ht": 2983,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": null,
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-F-R290-190S",
    "nom": "Clivet AQUA F R290 190S — solaire, 180 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1705,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 180,
      "classe_energetique": "A+",
      "type_systeme": "solaire intégré",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-F-R290-300",
    "nom": "Clivet AQUA F R290 300 — 275 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1815,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 275,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-F-R290-300S",
    "nom": "Clivet AQUA F R290 300S — solaire, 270 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1930,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 270,
      "classe_energetique": "A+",
      "type_systeme": "solaire intégré",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-PLUS-SWAN2-300",
    "nom": "Clivet AQUA PLUS SWAN-2 300 — 284 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 1805,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 284,
      "classe_energetique": "A+",
      "type_systeme": "monobloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "CLIVET-AQUA-PLUS-SWAN2-300S",
    "nom": "Clivet AQUA PLUS SWAN-2 300S — solaire, 272 L, classe A+",
    "marque": "Clivet",
    "prix_ht": 2005,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 272,
      "classe_energetique": "A+",
      "type_systeme": "solaire intégré",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX-SPLIT3-150",
    "nom": "Thermor Aéromax Split 3 150 L + unité extérieure, classe A+",
    "marque": "Thermor",
    "prix_ht": 2396,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 150,
      "classe_energetique": "A+",
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX-SPLIT3-200",
    "nom": "Thermor Aéromax Split 3 200 L + unité extérieure, classe A+",
    "marque": "Thermor",
    "prix_ht": 2481,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": "A+",
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "THERMOR-AEROMAX-SPLIT3-270",
    "nom": "Thermor Aéromax Split 3 270 L + unité extérieure, classe A+",
    "marque": "Thermor",
    "prix_ht": 2805,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 270,
      "classe_energetique": "A+",
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-SPLIT-INVERTER-150",
    "nom": "Atlantic Calypso Connecté Split Inverter 150 L",
    "marque": "Atlantic",
    "prix_ht": 3150.71,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 150,
      "classe_energetique": null,
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-SPLIT-INVERTER-200",
    "nom": "Atlantic Calypso Connecté Split Inverter 200 L",
    "marque": "Atlantic",
    "prix_ht": 3239.81,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 200,
      "classe_energetique": null,
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "ATLANTIC-CALYPSO-SPLIT-INVERTER-270",
    "nom": "Atlantic Calypso Connecté Split Inverter 270 L",
    "marque": "Atlantic",
    "prix_ht": 3562.09,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 270,
      "classe_energetique": null,
      "type_systeme": "split",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "BT270L-GENERIQUE",
    "nom": "Ballon thermodynamique générique BT 270 L / bibloc",
    "marque": "Générique",
    "prix_ht": 3877,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-TH-148",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Chauffe-eau thermodynamique. Prix de fourniture seule. Pose indicative 500 à 1 500 € TTC selon configuration ; chiffrer séparément. Aides CEE indicatives, à vérifier selon fiche officielle et dossier.",
    "caracteristiques": {
      "volume_litres": 270,
      "classe_energetique": null,
      "type_systeme": "bibloc",
      "fiche_cee": "BAR-TH-148",
      "maprimerenov_geste_seul_eur": 0,
      "prime_cee_indicative_eur": {
        "maison_individuelle": {
          "min": 429,
          "max": 1029
        },
        "appartement": {
          "min": 344,
          "max": 826
        }
      },
      "bonification_cee_indicative": {
        "menages_modestes": "x7",
        "autres_menages": "x4"
      },
      "tva_indicative": 5.5,
      "prix_fourniture_seule": true,
      "pose_estimation_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "prix_pose_a_chiffrer_separement": true
    }
  },
  {
    "categorie": "ballon_thermodynamique",
    "reference": "POSE-BALLON-THERMODYNAMIQUE-ESTIMATION",
    "nom": "Pose chauffe-eau thermodynamique — montant à chiffrer selon chantier",
    "marque": "Main-d’œuvre",
    "prix_ht": 0,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Ligne de pose à compléter au devis : estimation indicative 500 à 1 500 € TTC selon raccordement aéraulique, gainage, liaison frigorifique et complexité. Le prix est volontairement à renseigner, aucun forfait HT fixe n’a été fourni.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "montant_a_saisir_sur_devis": true,
      "estimation_pose_ttc_eur": {
        "min": 500,
        "max": 1500
      },
      "tva_indicative": 5.5
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-FIXE-M2",
    "nom": "Châssis fixe PVC sur mesure (MEN-PVC-FIXE)",
    "marque": "PVC",
    "prix_ht": 450,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-F1V-M2",
    "nom": "Fenêtre PVC 1 vantail (MEN-PVC-F1V)",
    "marque": "PVC",
    "prix_ht": 660,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-F2V-M2",
    "nom": "Fenêtre PVC 2 vantaux (MEN-PVC-F2V)",
    "marque": "PVC",
    "prix_ht": 695,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-PF1V-M2",
    "nom": "Porte-fenêtre PVC 1 vantail (MEN-PVC-PF1V)",
    "marque": "PVC",
    "prix_ht": 760,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-PF2V-M2",
    "nom": "Porte-fenêtre PVC 2 vantaux (MEN-PVC-PF2V)",
    "marque": "PVC",
    "prix_ht": 800,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PVC-COUL-M2",
    "nom": "Coulissant PVC sur mesure 2 ou 3 rails (MEN-PVC-COUL)",
    "marque": "PVC",
    "prix_ht": 870,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALU-F2V-M2",
    "nom": "Fenêtre aluminium RPT 2 vantaux (MEN-ALU-F2V)",
    "marque": "Aluminium",
    "prix_ht": 1042,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALU-PF2V-M2",
    "nom": "Porte-fenêtre aluminium RPT 2 vantaux (MEN-ALU-PF2V)",
    "marque": "Aluminium",
    "prix_ht": 1138,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-BOIS-F2V-M2",
    "nom": "Fenêtre bois 2 vantaux (MEN-BOIS-F2V)",
    "marque": "Bois",
    "prix_ht": 1250,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALU-COUL-M2",
    "nom": "Coulissant aluminium RPT grandes largeurs (MEN-ALU-COUL)",
    "marque": "Aluminium",
    "prix_ht": 1305,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-BOIS-PF2V-M2",
    "nom": "Porte-fenêtre bois 2 vantaux (MEN-BOIS-PF2V)",
    "marque": "Bois",
    "prix_ht": 1368,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-MIXTE-F2V-M2",
    "nom": "Fenêtre mixte bois-aluminium 2 vantaux (MEN-MIXTE-F2V)",
    "marque": "Bois-aluminium",
    "prix_ht": 1668,
    "unite": "m2",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FIXE-L30-H30",
    "nom": "Fenêtre fixe L30 × H30 cm",
    "marque": "Générique",
    "prix_ht": 118.24,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PVC-2V-125118",
    "nom": "Fenêtre PVC GoodHome 2 vantaux — 125 × 118 cm, Uw 1,2",
    "marque": "GoodHome",
    "prix_ht": 170,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      },
      "Uw_W_m2K": 1.2
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-ALU-ABATTANTE-12347",
    "nom": "Fenêtre aluminium GoodHome abattante — 123 × 47 cm",
    "marque": "GoodHome",
    "prix_ht": 210,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PF-PVC-120215",
    "nom": "Porte-fenêtre PVC GoodHome 2 vantaux — 120 × 215 cm",
    "marque": "GoodHome",
    "prix_ht": 275,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-ALU-COUL-12377",
    "nom": "Coulissant aluminium GoodHome 2 vantaux — 123 × 77 cm",
    "marque": "GoodHome",
    "prix_ht": 285,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PF-PVC-140215",
    "nom": "Porte-fenêtre PVC GoodHome 2 vantaux — 140 × 215 cm, Uw 1,2",
    "marque": "GoodHome",
    "prix_ht": 295,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      },
      "Uw_W_m2K": 1.2
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L75-H75-1V",
    "nom": "Fenêtre 1 vantail L75 × H75 cm",
    "marque": "Générique",
    "prix_ht": 338.42,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTP-V-U3",
    "nom": "Fenêtre de toit Fakro FTP-V U3 — 78 × 98 cm",
    "marque": "Fakro",
    "prix_ht": 343,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-VELUX-GGL-MK04-2076",
    "nom": "Fenêtre de toit Velux GGL MK04 2076 — 78 × 98 cm",
    "marque": "Velux",
    "prix_ht": 355,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PVC-2V-OB-120105",
    "nom": "Fenêtre PVC GoodHome 2 vantaux OB — 120 × 105 cm",
    "marque": "GoodHome",
    "prix_ht": 360,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-PVC-2V-OB-120125",
    "nom": "Fenêtre PVC GoodHome 2 vantaux OB — 120 × 125 cm",
    "marque": "GoodHome",
    "prix_ht": 375,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L80-H120-1V",
    "nom": "Fenêtre 1 vantail L80 × H120 cm",
    "marque": "Générique",
    "prix_ht": 423.84,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTP-V-U3-114118",
    "nom": "Fenêtre de toit Fakro FTP-V U3 — 114 × 118 cm",
    "marque": "Fakro",
    "prix_ht": 466,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-VELUX-GGL-SK06-114118",
    "nom": "Fenêtre de toit Velux GGL SK06 — 114 × 118 cm",
    "marque": "Velux",
    "prix_ht": 475,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-GOODHOME-ALU-PF-120215",
    "nom": "Porte-fenêtre aluminium GoodHome 2 vantaux — 120 × 215 cm",
    "marque": "GoodHome",
    "prix_ht": 560,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ROTO-R7-PVC-7898",
    "nom": "Fenêtre de toit Roto Designo R7 PVC — 78 × 98 cm",
    "marque": "Roto",
    "prix_ht": 634,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L120-H120-2V",
    "nom": "Fenêtre 2 vantaux L120 × H120 cm",
    "marque": "Générique",
    "prix_ht": 747.96,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ROTO-R7-PVC-114118",
    "nom": "Fenêtre de toit Roto Designo R7 PVC — 114 × 118 cm",
    "marque": "Roto",
    "prix_ht": 847,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PF-L85-H225",
    "nom": "Porte-fenêtre L85 × H225 cm",
    "marque": "Générique",
    "prix_ht": 850.25,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L120-H145-2V",
    "nom": "Fenêtre 2 vantaux L120 × H145 cm",
    "marque": "Générique",
    "prix_ht": 887.42,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L140-H145-2V",
    "nom": "Fenêtre 2 vantaux L140 × H145 cm",
    "marque": "Générique",
    "prix_ht": 944,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTP-V-P50-7898",
    "nom": "Fenêtre de toit Fakro FTP-V P50 — 78 × 98 cm",
    "marque": "Fakro",
    "prix_ht": 691,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTP-V-P50-114118",
    "nom": "Fenêtre de toit Fakro FTP-V P50 — 114 × 118 cm",
    "marque": "Fakro",
    "prix_ht": 968,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L95-H215-2V",
    "nom": "Fenêtre 2 vantaux L95 × H215 cm",
    "marque": "Générique",
    "prix_ht": 1105.36,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L120-H215-2V",
    "nom": "Fenêtre 2 vantaux L120 × H215 cm",
    "marque": "Générique",
    "prix_ht": 1210.22,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTT-U8-7898",
    "nom": "Fenêtre de toit Fakro FTT U8 Thermo — 78 × 98 cm",
    "marque": "Fakro",
    "prix_ht": 1294,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FEN-L120-H225-2V",
    "nom": "Fenêtre 2 vantaux L120 × H225 cm",
    "marque": "Générique",
    "prix_ht": 1354.38,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-FAKRO-FTT-U8-114118",
    "nom": "Fenêtre de toit Fakro FTT U8 Thermo — 114 × 118 cm",
    "marque": "Fakro",
    "prix_ht": 1766,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-HABILLAGE-ML",
    "nom": "Habillage intérieur et couvre-joints (MEN-HABILLAGE)",
    "marque": "Accessoire",
    "prix_ht": 28,
    "unite": "ml",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-ENTREE-AIR-HYGRO",
    "nom": "Entrée d’air hygroréglable (MEN-ENTREE-AIR)",
    "marque": "Accessoire",
    "prix_ht": 60,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ACCESS-APPUI-BAVETTE-ML",
    "nom": "Appui-bavette aluminium avec rejet d’eau (MEN-APPUI-BAVETTE)",
    "marque": "Accessoire",
    "prix_ht": 100,
    "unite": "ml",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-PRECADRE-METALLIQUE",
    "nom": "Pré-cadre métallique continu (MEN-PRECADRE)",
    "marque": "Accessoire",
    "prix_ht": 145,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-SEUIL-ALU-PMR",
    "nom": "Seuil aluminium PMR (MEN-SEUIL-PMR)",
    "marque": "Accessoire",
    "prix_ht": 150,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule communiqué le 19/10/2026. Aides et TVA à confirmer selon performances certifiées, nature exacte des travaux et réglementation en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du simple vitrage, performances Uw/Sw certifiées et exigences de la fiche officielle en vigueur. Aucune éligibilité automatique sans justificatif.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100,
        "condition": "Selon profil et règles en vigueur"
      },
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 100,
          "max": 300
        },
        "depose_totale": {
          "min": 250,
          "max": 500
        }
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-ALINE-PF-PVC-2V",
    "nom": "Porte-fenêtre ALINE 2 vantaux PVC",
    "marque": "Aline",
    "prix_ht": 340,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
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
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "MEN-KEYLITE-TCP-04-T",
    "nom": "Fenêtre de toit Keylite TCP-04-T Pin — 78 × 98 cm",
    "marque": "Keylite",
    "prix_ht": 315,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. Éligibilité aux aides à confirmer sur justificatifs fabricant et règles en vigueur.",
    "caracteristiques": {
      "type_menuiserie": "fenetre_ou_porte_fenetre",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "Uw_W_m2K": null,
      "condition_cee": "Vérifier les performances Uw/Sw certifiées et la fiche officielle en vigueur.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": {
        "min": 40,
        "max": 100
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "POSE-FENETRE-RENOVATION-ESTIMATION",
    "nom": "Pose fenêtre en rénovation — montant à chiffrer",
    "marque": "Main-d’œuvre",
    "prix_ht": 0,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Montant à renseigner selon chantier ; estimation indicative 100 à 300 € TTC par menuiserie en rénovation.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "montant_a_saisir_sur_devis": true,
      "estimation_pose_ttc_eur": {
        "min": 100,
        "max": 300
      }
    }
  },
  {
    "categorie": "menuiseries",
    "reference": "POSE-FENETRE-DEPOSE-TOTALE-ESTIMATION",
    "nom": "Pose fenêtre en dépose totale — montant à chiffrer",
    "marque": "Main-d’œuvre",
    "prix_ht": 0,
    "unite": "forfait",
    "tva": 5.5,
    "fiche_cee": "",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Montant à renseigner selon chantier ; estimation indicative 250 à 500 € TTC par menuiserie en dépose totale.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "montant_a_saisir_sur_devis": true,
      "estimation_pose_ttc_eur": {
        "min": 250,
        "max": 500
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-ARMANCE-2-PVC",
    "nom": "Porte d’entrée PVC Lapeyre Armance 2 — Ud 1,4",
    "marque": "Lapeyre",
    "prix_ht": 520,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.4
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-TALMONT-BOIS",
    "nom": "Porte d’entrée bois exotique Lapeyre Talmont — Ud 1,7",
    "marque": "Lapeyre",
    "prix_ht": 575,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": false,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Ud déclaré 1,7 W/m².K : ne pas déclarer éligible sans validation écrite de l’obligé et de la fiche applicable.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.7
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "MEN-PVC-PORTE",
    "nom": "Porte d’entrée PVC sur mesure — MEN-PVC-PORTE",
    "marque": "Générique",
    "prix_ht": 1808,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-EQUATION-ACIER",
    "nom": "Bel’M Équation acier — Ud 1,1",
    "marque": "Bel’M",
    "prix_ht": 1141.67,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-EQUATION-68-ACIER",
    "nom": "Bel’M Équation 68+ acier — Ud 0,75",
    "marque": "Bel’M",
    "prix_ht": 1785.83,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 0.75
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "LAPEYRE-SORBEY-ALU",
    "nom": "Lapeyre Sorbey aluminium — Ud 1,1",
    "marque": "Lapeyre",
    "prix_ht": 920,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-CYTISS-1-ALU",
    "nom": "Zilten CYTISS 1 aluminium — Ud 1,1",
    "marque": "Zilten",
    "prix_ht": 1768.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.1
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "MEN-ALU-PORTE",
    "nom": "Porte d’entrée aluminium RPT sur mesure — MEN-ALU-PORTE",
    "marque": "Générique",
    "prix_ht": 2500,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-COTIM-11-ALU",
    "nom": "Zilten COTIM 11 aluminium — Ud 0,91",
    "marque": "Zilten",
    "prix_ht": 2695,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 0.91
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "ZILTEN-K5-FAKTORY-ALU",
    "nom": "Zilten K5-FAKTORY aluminium — Ud 0,68",
    "marque": "Zilten",
    "prix_ht": 4248.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 0.68
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "BELM-SIDERALE-ALU",
    "nom": "Bel’M Sidérale aluminium — Ud 0,68",
    "marque": "Bel’M",
    "prix_ht": 4418.33,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 0.68
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
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-PVC-PORTE",
    "nom": "Porte d’entrée PVC Tryba sur mesure",
    "marque": "Tryba",
    "prix_ht": 1450,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "KLINE-BALANCINE-ALU",
    "nom": "K•LINE Balancine aluminium — Ud 1,2",
    "marque": "K•LINE",
    "prix_ht": 2150,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 1.2
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "KLINE-CELLA-PLEINE",
    "nom": "K•LINE Cella pleine — Ud 0,68",
    "marque": "K•LINE",
    "prix_ht": 2650,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      },
      "Ud_W_m2K": 0.68
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-ALU-MONOBLOC-PORTE",
    "nom": "Tryba aluminium monobloc sur mesure",
    "marque": "Tryba",
    "prix_ht": 3100,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
    }
  },
  {
    "categorie": "menuiseries_portes",
    "reference": "TRYBA-BOIS-PORTE",
    "nom": "Tryba Bois sur mesure",
    "marque": "Tryba",
    "prix_ht": 2100,
    "unite": "unite",
    "tva": 5.5,
    "fiche_cee": "BAR-EN-104",
    "eligible_cee": true,
    "eligible_mpr": false,
    "description": "Prix indicatif de fourniture seule. MaPrimeRénov’ geste isolé : 0 €. Prime CEE indicative ; critères, Ud certifié et taux de TVA à confirmer avant engagement.",
    "caracteristiques": {
      "type_menuiserie": "porte_entree",
      "prix_fourniture_seule": true,
      "tva_indicative": 5.5,
      "fiche_cee": "BAR-EN-104",
      "condition_cee": "Vérifier remplacement du volume chauffé vers extérieur, caractéristiques certifiées et conditions exactes de la fiche officielle. Ud ≤ 1,7 fourni à titre de repère, sans garantie d’éligibilité.",
      "prime_cee_indicative_eur_par_equipement": {
        "min": 30,
        "max": 80
      },
      "maprimerenov_geste_seul_eur": 0,
      "pose_estimation_ttc_eur": {
        "renovation": {
          "min": 250,
          "max": 400
        },
        "depose_totale": {
          "min": 450,
          "max": 600
        }
      }
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
    "description": "Forfait de main-d’œuvre communiqué : dépose, évacuation, pose, étanchéité périphérique et réglage. À distinguer du prix de fourniture.",
    "caracteristiques": {
      "type_prestation": "pose",
      "prix_fourniture_incluse": false,
      "tva_indicative": 5.5
    }
  }
]
$products$::jsonb) LOOP
    SELECT id INTO v_id FROM public.catalogue_produits WHERE reference=p->>'reference' AND entreprise_id=v_entreprise LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (entreprise_id,categorie,nom,marque,reference,description,caracteristiques,prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,public_cible)
      VALUES (v_entreprise,p->>'categorie',p->>'nom',COALESCE(p->>'marque',''),p->>'reference',COALESCE(p->>'description',''),COALESCE(p->'caracteristiques','{}'::jsonb),COALESCE((p->>'prix_ht')::numeric,0),COALESCE(p->>'unite','unite'),COALESCE((p->>'tva')::numeric,5.5),COALESCE((p->>'eligible_mpr')::boolean,false),COALESCE((p->>'eligible_cee')::boolean,false),COALESCE(p->>'fiche_cee',''),true,'particulier');
    ELSE
      UPDATE public.catalogue_produits SET categorie=p->>'categorie',nom=p->>'nom',marque=COALESCE(p->>'marque',''),description=COALESCE(p->>'description',''),caracteristiques=COALESCE(caracteristiques,'{}'::jsonb)||COALESCE(p->'caracteristiques','{}'::jsonb),prix_unitaire_ht=COALESCE((p->>'prix_ht')::numeric,prix_unitaire_ht),unite=COALESCE(p->>'unite',unite),tva_taux=COALESCE((p->>'tva')::numeric,tva_taux),eligible_mpr=COALESCE((p->>'eligible_mpr')::boolean,false),eligible_cee=COALESCE((p->>'eligible_cee')::boolean,false),fiche_cee=COALESCE(p->>'fiche_cee',''),actif=true WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;
