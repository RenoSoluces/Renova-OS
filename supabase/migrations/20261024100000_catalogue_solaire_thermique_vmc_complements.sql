-- Renova OS — compléments catalogue fournisseur : solaire thermique, SSC et VMC
-- Préparé le 23/10/2026 à partir des prix explicitement communiqués par Reno Soluces.
-- Migration idempotente : mise à jour par référence ; aucune suppression ; aucun prix existant
-- n'est remplacé lorsqu'aucun nouveau prix explicite n'est fourni.
-- Les prix 0 ou non communiqués ne sont pas interprétés comme des prix validés.

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
  v_ajoutes integer := 0;
  v_maj integer := 0;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : aucun produit importé.';
    RETURN;
  END IF;

  FOR p IN
    SELECT value FROM jsonb_array_elements($products$
[
  {
    "reference": "SOL-BALLON-DD-INISOL-UNO-E200",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno E BESL 200 — ballon solaire 225 L, appoint électrique 1,5 kW",
    "marque": "De Dietrich",
    "prix_ht": 2402,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786636",
      "volume_l": 225,
      "appoint": "électrique",
      "puissance_appoint_kW": 1.5,
      "capteurs": "à associer selon dimensionnement",
      "prix_fournisseur_ht": 2402
    }
  },
  {
    "reference": "CESI-DD-INISOL-UNO-E-BESL-300",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno E BESL 300 — ballon solaire 300 L, appoint électrique 2,3 kW",
    "marque": "De Dietrich",
    "prix_ht": 2754,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786637",
      "volume_l": 300,
      "appoint": "électrique",
      "puissance_appoint_kW": 2.3,
      "capteurs": "à associer selon dimensionnement",
      "prix_fournisseur_ht": 2754
    }
  },
  {
    "reference": "SOL-BALLON-DD-INISOL-UNO-E400",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno E BESL 400 — ballon solaire 400 L, appoint électrique 3 kW",
    "marque": "De Dietrich",
    "prix_ht": 4070,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786638",
      "volume_l": 400,
      "appoint": "électrique",
      "puissance_appoint_kW": 3,
      "capteurs": "à associer selon dimensionnement",
      "prix_fournisseur_ht": 4070
    }
  },
  {
    "reference": "SOL-PACK-DD-DH200-1CAP",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich pack solaire — 1 capteur DH200 SL, 2 m²",
    "marque": "De Dietrich",
    "prix_ht": 1556,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7652623",
      "nombre_capteurs": 1,
      "surface_capteurs_m2": 2,
      "prix_fournisseur_ht": 1556
    }
  },
  {
    "reference": "SOL-PACK-DD-D230-2CAP",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich pack solaire — 2 capteurs D230 TB, 5 m²",
    "marque": "De Dietrich",
    "prix_ht": 2616,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7854254",
      "nombre_capteurs": 2,
      "surface_capteurs_m2": 5,
      "prix_fournisseur_ht": 2616
    }
  },
  {
    "reference": "CESI-DD-PACK-2-DH200SL",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich pack solaire — 2 capteurs DH200 SL, 4 m²",
    "marque": "De Dietrich",
    "prix_ht": 2596,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7652638",
      "nombre_capteurs": 2,
      "surface_capteurs_m2": 4,
      "prix_fournisseur_ht": 2596
    }
  },
  {
    "reference": "CESI-DD-PACK-3-D230TB",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich pack solaire — 3 capteurs D230 TB, 7 m²",
    "marque": "De Dietrich",
    "prix_ht": 3835,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7854328",
      "nombre_capteurs": 3,
      "surface_capteurs_m2": 7,
      "prix_fournisseur_ht": 3835
    }
  },
  {
    "reference": "SOL-PACK-DD-DH200-3CAP",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich pack solaire — 3 capteurs DH200 SL, 6 m²",
    "marque": "De Dietrich",
    "prix_ht": 4024,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7652640",
      "nombre_capteurs": 3,
      "surface_capteurs_m2": 6,
      "prix_fournisseur_ht": 4024
    }
  },
  {
    "reference": "CESI-DD-INISOL-UNO-BSL-200",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno BSL 200 — ballon solaire 225 L, appoint hydraulique",
    "marque": "De Dietrich",
    "prix_ht": 2422,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786639",
      "volume_l": 225,
      "appoint": "hydraulique",
      "configuration": "tout équipé",
      "prix_fournisseur_ht": 2422
    }
  },
  {
    "reference": "SOL-BALLON-DD-INISOL-UNO-BSL300",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno BSL 300 — ballon solaire 300 L, appoint hydraulique",
    "marque": "De Dietrich",
    "prix_ht": 2591,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786640",
      "volume_l": 300,
      "appoint": "hydraulique",
      "prix_fournisseur_ht": 2591
    }
  },
  {
    "reference": "CESI-DD-INISOL-UNO-BSL-400",
    "categorie": "solaire_thermique",
    "nom": "De Dietrich Inisol Uno BSL 400 — ballon solaire 400 L, appoint hydraulique",
    "marque": "De Dietrich",
    "prix_ht": 4070,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "7786641",
      "volume_l": 400,
      "appoint": "hydraulique",
      "prix_fournisseur_ht": 4070
    }
  },
  {
    "reference": "SOL-GIORDANO-GIORSOL-ATV200",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol ATV 200 — système solaire autovidangeable 200 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 200,
      "principe": "Ecodrainback, prémonté et autovidangeable",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-GIORDANO-GIORSOL-ATV-300",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol ATV 300 — système solaire autovidangeable 300 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 300,
      "principe": "Ecodrainback, prémonté et autovidangeable",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-GIORDANO-GIORSOL-ATV-400",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol ATV 400 — système solaire autovidangeable 400 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 400,
      "principe": "Ecodrainback, prémonté et autovidangeable",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-GIORDANO-GIORSOL-P-200",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol P 200 — système solaire sous pression 200 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 200,
      "principe": "Circuit sous pression",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-GIORDANO-GIORSOL-P-300",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol P 300 — système solaire sous pression 300 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 300,
      "principe": "Circuit sous pression",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-GIORDANO-GIORSOL-P-400",
    "categorie": "solaire_thermique",
    "nom": "Giordano Giorsol P 400 — système solaire sous pression 400 L",
    "marque": "Giordano",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 400,
      "principe": "Circuit sous pression",
      "capteurs": "Ecosol à associer",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-SD-HELIOSET-250",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 250 — monovalent, 253 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 253,
      "version": "monovalent",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-SD-HELIOSET-250-BID",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 250 BID — bivalent FE S2, 250 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 250,
      "version": "bivalent FE S2 250 BID",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "SOL-SAUNIER-HELIOS-250E",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 250 E — électro-solaire, 252 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 252,
      "version": "électro-solaire",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-SD-HELIOSET-250-P",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 250 P — monovalent pressurisé, 253 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 253,
      "version": "monovalent pressurisé",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-SD-HELIOSET-350-EP",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 350 EP — électro-solaire, 394 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 394,
      "version": "électro-solaire",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-SD-HELIOSET-350-P",
    "categorie": "solaire_thermique",
    "nom": "Saunier Duval HelioSet 350 P — monovalent pressurisé, 395 L, classe B",
    "marque": "Saunier Duval",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 395,
      "version": "monovalent pressurisé",
      "classe_energetique": "B",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "SOL-VIESSMANN-VITOSOL-141FM",
    "categorie": "solaire_thermique",
    "nom": "Viessmann Vitosol 141-FM SVKF — 250 L et 2 capteurs, surimposition",
    "marque": "Viessmann",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "gamme": "Vitosol 141-FM",
      "volume_l": 250,
      "nombre_capteurs": 2,
      "montage": "surimposition",
      "ballon": "Vitocell 100-B/-W",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-VIESSMANN-141FM-SVKG",
    "categorie": "solaire_thermique",
    "nom": "Viessmann Vitosol 141-FM SVKG — 250 L et 2 capteurs, intégration toiture",
    "marque": "Viessmann",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "gamme": "Vitosol 141-FM",
      "volume_l": 250,
      "nombre_capteurs": 2,
      "montage": "intégration toiture",
      "ballon": "Vitocell 100-B/-W",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-CHAFF-ZELIOS-EASY-200-ELEC",
    "categorie": "solaire_thermique",
    "nom": "Chaffoteaux Zelios Easy 200 électrique — CDE200, 200 L, classe C",
    "marque": "Chaffoteaux",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "3023376",
      "volume_l": 200,
      "version": "CDE200 électrique",
      "classe_energetique": "C",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-CHAFF-ZELIOS-EASY-200-GAZ",
    "categorie": "solaire_thermique",
    "nom": "Chaffoteaux Zelios Easy 200 gaz — CD2, 200 L, classe C",
    "marque": "Chaffoteaux",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "3023301",
      "volume_l": 200,
      "version": "CD2 gaz",
      "classe_energetique": "C",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-CHAFF-ZELIOS-EASY-300-ELEC",
    "categorie": "solaire_thermique",
    "nom": "Chaffoteaux Zelios Easy 300 électrique — CDE300, 300 L, classe C",
    "marque": "Chaffoteaux",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "3023377",
      "volume_l": 300,
      "version": "CDE300 électrique",
      "classe_energetique": "C",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "CESI-CHAFF-ZELIOS-EASY-300-GAZ",
    "categorie": "solaire_thermique",
    "nom": "Chaffoteaux Zelios Easy 300 gaz — CD2, 300 L, classe C",
    "marque": "Chaffoteaux",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "code_article": "3023302",
      "volume_l": 300,
      "version": "CD2 gaz",
      "classe_energetique": "C",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "SSC-ECOYA",
    "categorie": "ssc",
    "nom": "Système solaire combiné Ecoya — classe A",
    "marque": "Ecoya",
    "prix_ht": 11160,
    "unite": "unite",
    "caracteristiques": {
      "classe_energetique": "A",
      "prix_fournisseur_ht": 11160
    }
  },
  {
    "reference": "SSC-THERMADOR-ASTREA-ITHEON-480",
    "categorie": "ssc",
    "nom": "Thermador Astrea Ithéon 480 — ballon double cuve 300 L ECS + 180 L chauffage, 4 capteurs",
    "marque": "Thermador",
    "prix_ht": 9200,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "PSOLSCE44",
      "volume_total_l": 480,
      "volume_ecs_l": 300,
      "volume_chauffage_l": 180,
      "nombre_capteurs": 4,
      "reference_capteur": "PSOL25VM",
      "resistance_appoint_kW": 3,
      "classe_energetique": "C",
      "prix_fournisseur_ht": 9200
    }
  },
  {
    "reference": "SSC-DEDIETRICH-QUADRO700",
    "categorie": "ssc",
    "nom": "De Dietrich Quadro 700 SolarSystem — pack 4 capteurs D230 TB, 9 m²",
    "marque": "De Dietrich",
    "prix_ht": 12096.7,
    "unite": "unite",
    "caracteristiques": {
      "reference_ballon": "7805656",
      "reference_pack_capteurs": "7854360",
      "nombre_capteurs": 4,
      "surface_capteurs_m2": 9,
      "prix_fournisseur_ht": 12096.7
    }
  },
  {
    "reference": "SSC-CHAPPEE-WSC400",
    "categorie": "ssc",
    "nom": "Chappée WSC400 — ballon 402 L avec 4 capteurs SOL200LH et station solaire WSC",
    "marque": "Chappée",
    "prix_ht": 9972.4,
    "unite": "unite",
    "caracteristiques": {
      "volume_l": 402,
      "nombre_capteurs": 4,
      "reference_capteur": "SOL200LH",
      "station_solaire": "WSC",
      "montage": "support toiture",
      "prix_fournisseur_ht": 9972.4
    }
  },
  {
    "reference": "VMC-ACCESS-BOUCHE",
    "categorie": "vmc",
    "nom": "Bouche VMC — accessoire",
    "marque": "Accessoire",
    "prix_ht": 90,
    "unite": "unite",
    "caracteristiques": {
      "type_prestation": "accessoire",
      "prix_fournisseur_ht": 90
    }
  },
  {
    "reference": "VMC-ACCESS-GAINES-ML",
    "categorie": "vmc",
    "nom": "Gaines VMC — au mètre linéaire",
    "marque": "Accessoire",
    "prix_ht": 30,
    "unite": "ml",
    "caracteristiques": {
      "type_prestation": "accessoire",
      "prix_fournisseur_ht": 30
    }
  },
  {
    "reference": "VMC-SIMPLE-FLUX-GENERIQUE-POSEE",
    "categorie": "vmc",
    "nom": "VMC simple flux — matériel et pose",
    "marque": "Générique",
    "prix_ht": 1895,
    "unite": "forfait",
    "caracteristiques": {
      "offre": "matériel + pose",
      "puissance_transmise_kW": 12.1,
      "note": "Puissance 12,1 kW recopiée de la donnée fournie, à vérifier car potentiellement incohérente",
      "prix_fournisseur_ht": 1895
    }
  },
  {
    "reference": "VMC-DOUBLE-FLUX-POSEE",
    "categorie": "vmc",
    "nom": "VMC double flux — matériel et pose",
    "marque": "Générique",
    "prix_ht": 5200,
    "unite": "forfait",
    "caracteristiques": {
      "offre": "matériel + pose",
      "prix_fournisseur_ht": 5200
    }
  },
  {
    "reference": "VMC-HYGRO-A-INFINITY",
    "categorie": "vmc",
    "nom": "VMC simple flux hygroréglable Hygro A Infinity",
    "marque": "Infinity",
    "prix_ht": 0,
    "unite": "unite",
    "caracteristiques": {
      "type_flux": "simple",
      "type_hygro": "A",
      "prix_a_confirmer": true
    }
  },
  {
    "reference": "VMC-SF-HYGRO-B",
    "categorie": "vmc",
    "nom": "VMC simple flux hygroréglable Hygro B",
    "marque": "Générique",
    "prix_ht": 1550,
    "unite": "forfait",
    "caracteristiques": {
      "type_flux": "simple",
      "type_hygro": "B",
      "offre": "matériel + pose",
      "prix_fournisseur_ht": 1550
    }
  },
  {
    "reference": "VMC-DF-FRANCEAIR-COCOON30",
    "categorie": "vmc",
    "nom": "France Air Cocoon 30 — VMC double flux haut rendement",
    "marque": "France Air",
    "prix_ht": 4164,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "61017996",
      "rendement_pct": 95,
      "gamme": "haut de gamme",
      "prix_fournisseur_ht": 4164
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO225-DHU-RD",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 225 DHU RD",
    "marque": "S&P",
    "prix_ht": 1905,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600103",
      "prix_fournisseur_ht": 1905
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO225-FL",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 225 FL filaire",
    "marque": "S&P",
    "prix_ht": 1805,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600102",
      "prix_fournisseur_ht": 1805
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO225-SERENITE",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 225 SERENITE RD",
    "marque": "S&P",
    "prix_ht": 2090,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600104",
      "prix_fournisseur_ht": 2090
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO315-DHU-RD",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 315 DHU RD",
    "marque": "S&P",
    "prix_ht": 2720,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600105",
      "prix_fournisseur_ht": 2720
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO315-SERENITE",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 315 SERENITE RD",
    "marque": "S&P",
    "prix_ht": 2875,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600106",
      "prix_fournisseur_ht": 2875
    }
  },
  {
    "reference": "VMC-DF-SP-DOMEO-EVO450-SERENITE",
    "categorie": "vmc",
    "nom": "S&P DOMEO EVO 450 SERENITE RD",
    "marque": "S&P",
    "prix_ht": 4920,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "600107",
      "prix_fournisseur_ht": 4920
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-CLASSIC-CORD",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Classic — kit CORD",
    "marque": "Aldes",
    "prix_ht": 490,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033532",
      "prix_fournisseur_ht": 490
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-CLASSIC-KIT",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Classic — kit ELEC",
    "marque": "Aldes",
    "prix_ht": 511,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033531",
      "prix_fournisseur_ht": 511
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-COMPACT-CLASSIC-KIT",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Compact Classic — kit",
    "marque": "Aldes",
    "prix_ht": 578,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033549",
      "prix_fournisseur_ht": 578
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-CLASSIC-BDH",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Classic — groupe seul",
    "marque": "Aldes",
    "prix_ht": 339,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "à confirmer",
      "prix_fournisseur_ht": 339
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-COMPACT-CLASSIC-GROUPE",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Compact Classic — groupe seul",
    "marque": "Aldes",
    "prix_ht": 369,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033048",
      "prix_fournisseur_ht": 369
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-PREMIUM-MW-ELEC",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Premium MW — kit ELEC",
    "marque": "Aldes",
    "prix_ht": 556,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033435",
      "prix_fournisseur_ht": 556
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-COMPACT-KIT",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Compact Premium MW — kit ELEC",
    "marque": "Aldes",
    "prix_ht": 708,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033451",
      "prix_fournisseur_ht": 708
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-PREMIUM-MW-CORD",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Premium MW — kit CORD",
    "marque": "Aldes",
    "prix_ht": 574,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033436",
      "prix_fournisseur_ht": 574
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-PREMIUM-MW-ELEC-2",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Premium MW — kit ELEC variante",
    "marque": "Aldes",
    "prix_ht": 595,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11033434",
      "prix_fournisseur_ht": 595
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-COMPACT-PREMIUM",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Compact Premium MW — groupe seul",
    "marque": "Aldes",
    "prix_ht": 494,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "à confirmer",
      "prix_fournisseur_ht": 494
    }
  },
  {
    "reference": "VMC-ALDES-EASYHOME-PREMIUM-MW-GROUPE",
    "categorie": "vmc",
    "nom": "Aldes EasyHOME HYGRO Premium MW — groupe seul",
    "marque": "Aldes",
    "prix_ht": 462,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "à confirmer",
      "prix_fournisseur_ht": 462
    }
  },
  {
    "reference": "VMC-SP-HYDRA-ECOWATT2",
    "categorie": "vmc",
    "nom": "S&P HYDRA ECOWATT 2 — kit",
    "marque": "S&P",
    "prix_ht": 415,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "604212",
      "prix_fournisseur_ht": 415
    }
  },
  {
    "reference": "VMC-SP-HYDRA-ST2",
    "categorie": "vmc",
    "nom": "S&P HYDRA ST2 — kit",
    "marque": "S&P",
    "prix_ht": 340,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "604011",
      "prix_fournisseur_ht": 340
    }
  },
  {
    "reference": "VMC-FRANCEAIR-HYGRA-RT4-KIT",
    "categorie": "vmc",
    "nom": "France Air Hygra RT Control 4 — kit",
    "marque": "France Air",
    "prix_ht": 834,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "61039580",
      "prix_fournisseur_ht": 834
    }
  },
  {
    "reference": "VMC-FRANCEAIR-HYGRA-RT4-COMPACT",
    "categorie": "vmc",
    "nom": "France Air Hygra RT Control 4 Compact — kit",
    "marque": "France Air",
    "prix_ht": 1054,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "61039582",
      "prix_fournisseur_ht": 1054
    }
  },
  {
    "reference": "VMC-FRANCEAIR-HYGRA-RT4",
    "categorie": "vmc",
    "nom": "France Air Hygra RT Control 4 — caisson seul",
    "marque": "France Air",
    "prix_ht": 523,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "61039579",
      "prix_fournisseur_ht": 523
    }
  },
  {
    "reference": "VMC-FRANCEAIR-HYGRA-RT4-COMPACT-GROUPE",
    "categorie": "vmc",
    "nom": "France Air Hygra RT Control 4 Compact — caisson seul",
    "marque": "France Air",
    "prix_ht": 743,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "61039581",
      "prix_fournisseur_ht": 743
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-GROUPE",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy — groupe seul",
    "marque": "Atlantic",
    "prix_ht": 349.17,
    "unite": "unite",
    "caracteristiques": {
      "prix_fournisseur_ht": 349.17
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-KIT",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy — kit",
    "marque": "Atlantic",
    "prix_ht": 270,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412292",
      "prix_fournisseur_ht": 270
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-FLEX",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy Flex — kit",
    "marque": "Atlantic",
    "prix_ht": 574.17,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412295",
      "prix_fournisseur_ht": 574.17
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-BC2-KIT",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy BC2 — kit",
    "marque": "Atlantic",
    "prix_ht": 340,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412320",
      "prix_fournisseur_ht": 340
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX-PLUS-KIT",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy BC Flex+ — kit",
    "marque": "Atlantic",
    "prix_ht": 400,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412278",
      "prix_fournisseur_ht": 400
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-BC2-GROUPE",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy BC2 — groupe seul",
    "marque": "Atlantic",
    "prix_ht": 430,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412319",
      "prix_fournisseur_ht": 430
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy BC Flex — groupe seul",
    "marque": "Atlantic",
    "prix_ht": 555.83,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412279",
      "prix_fournisseur_ht": 555.83
    }
  },
  {
    "reference": "VMC-ATL-HYGROCOSY-BC-FLEX-PLUS",
    "categorie": "vmc",
    "nom": "Atlantic Hygrocosy BC Flex+ — groupe seul",
    "marque": "Atlantic",
    "prix_ht": 567.5,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412280",
      "prix_fournisseur_ht": 567.5
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR300-ERV",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 300 ERV Premium",
    "marque": "Aldes",
    "prix_ht": 5589,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11023477",
      "prix_fournisseur_ht": 5589
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR300-PREM",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 300 Premium",
    "marque": "Aldes",
    "prix_ht": 4279,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11023474",
      "prix_fournisseur_ht": 4279
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR450-ERV",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 450 ERV Premium",
    "marque": "Aldes",
    "prix_ht": 6754,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11023478",
      "prix_fournisseur_ht": 6754
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR450-PREM",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 450 Premium",
    "marque": "Aldes",
    "prix_ht": 5589,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11023476",
      "prix_fournisseur_ht": 5589
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR300-PREM-KIT",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 300 Premium — kit",
    "marque": "Aldes",
    "prix_ht": 4231,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11027108",
      "prix_fournisseur_ht": 4231
    }
  },
  {
    "reference": "VMC-DF-ALDES-INSPIRAIR450-PREM-KIT",
    "categorie": "vmc",
    "nom": "Aldes InspirAIR Top 450 Premium — kit",
    "marque": "Aldes",
    "prix_ht": 5455,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "11027109",
      "prix_fournisseur_ht": 5455
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587657",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro A T3-T7, 1 SdB + 1 WC piles",
    "marque": "Nather",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587657",
      "configuration": "Hygro A T3-T7, 1 salle de bain + 1 WC, piles",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587656",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro B T1-T2, 1 SdB/WC piles",
    "marque": "Nather",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587656",
      "configuration": "Hygro B T1-T2, 1 SdB/WC, piles",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587654",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro B T3-T7, SdB + WC 230 V avec télécommande cuisine",
    "marque": "Nather",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587654",
      "configuration": "Hygro B T3-T7, 1 SdB + 1 WC 230 V, télécommande cuisine",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587653",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro B T3-T7, SdB + WC 230 V sans télécommande",
    "marque": "Nather",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587653",
      "configuration": "Hygro B T3-T7, 1 SdB + 1 WC 230 V, sans télécommande",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587655",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro B T3-T7, SdB + WC cordelette",
    "marque": "Nather",
    "prix_ht": null,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587655",
      "configuration": "Hygro B T3-T7, 1 SdB + 1 WC, cordelette",
      "prix_a_renseigner": true
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-587652",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — Hygro B T3-T7, piles",
    "marque": "Nather",
    "prix_ht": 320,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587652",
      "prix_fournisseur_ht": 320
    }
  },
  {
    "reference": "VMC-NATHER-MAESTRO-GROUPE-587644",
    "categorie": "vmc",
    "nom": "Nather MAESTRO EC — groupe seul",
    "marque": "Nather",
    "prix_ht": 195,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "587644",
      "prix_fournisseur_ht": 195
    }
  },
  {
    "reference": "VMC-NATHER-MODULO2-990583",
    "categorie": "vmc",
    "nom": "Nather MODULO 2 BC Hygro B — kit piles WC / cordelette",
    "marque": "Nather",
    "prix_ht": 588.03,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990583",
      "prix_fournisseur_ht": 588.03
    }
  },
  {
    "reference": "VMC-NATHER-MODULO2-990580",
    "categorie": "vmc",
    "nom": "Nather MODULO 2 BC Hygro B — kit cordelette",
    "marque": "Nather",
    "prix_ht": 541.34,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990580",
      "prix_fournisseur_ht": 541.34
    }
  },
  {
    "reference": "VMC-NATHER-MODULO2-990581",
    "categorie": "vmc",
    "nom": "Nather MODULO 2 BC Hygro B — kit piles",
    "marque": "Nather",
    "prix_ht": 604.01,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990581",
      "prix_fournisseur_ht": 604.01
    }
  },
  {
    "reference": "VMC-NATHER-MODULO2-990582",
    "categorie": "vmc",
    "nom": "Nather MODULO 2 BC Hygro B — kit 230 V",
    "marque": "Nather",
    "prix_ht": 710.05,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990582",
      "prix_fournisseur_ht": 710.05
    }
  },
  {
    "reference": "VMC-NATHER-MODULO2-GROUPE-990578",
    "categorie": "vmc",
    "nom": "Nather MODULO 2 BC Hygro B — groupe seul",
    "marque": "Nather",
    "prix_ht": 284.08,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990578",
      "prix_fournisseur_ht": 284.08
    }
  },
  {
    "reference": "VMC-SP-OCTEO-HYGRO-ECOWATT2",
    "categorie": "vmc",
    "nom": "S&P OCTEO HYGRO ECOWATT 2 — kit",
    "marque": "S&P",
    "prix_ht": 560,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "607812",
      "prix_fournisseur_ht": 560
    }
  },
  {
    "reference": "VMC-SP-OCTEO-HYGRO-HP-ECOWATT",
    "categorie": "vmc",
    "nom": "S&P OCTEO HYGRO HP ECOWATT",
    "marque": "S&P",
    "prix_ht": 615,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "607911",
      "prix_fournisseur_ht": 615
    }
  },
  {
    "reference": "VMC-SP-OCTEO-HYGRO-ST",
    "categorie": "vmc",
    "nom": "S&P OCTEO HYGRO ST — kit",
    "marque": "S&P",
    "prix_ht": 435,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "607711",
      "prix_fournisseur_ht": 435
    }
  },
  {
    "reference": "VMC-SP-OCTEO-HYGRO-GROUPE",
    "categorie": "vmc",
    "nom": "S&P OCTEO HYGRO — groupe seul",
    "marque": "S&P",
    "prix_ht": 210,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "607700",
      "prix_fournisseur_ht": 210
    }
  },
  {
    "reference": "VMC-NATHER-OPTIMEA-DF",
    "categorie": "vmc",
    "nom": "Nather OPTIMEA — VMC double flux",
    "marque": "Nather",
    "prix_ht": 3895.39,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "990642",
      "type_flux": "double",
      "prix_fournisseur_ht": 3895.39
    }
  },
  {
    "reference": "VMC-ATL-OPTIMOCOSY-HR-ACCESS",
    "categorie": "vmc",
    "nom": "Atlantic Optimocosy HR Access — double flux",
    "marque": "Atlantic",
    "prix_ht": 3306.67,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412258",
      "type_flux": "double",
      "prix_fournisseur_ht": 3306.67
    }
  },
  {
    "reference": "VMC-ATL-OPTIMOCOSY-HR-PLUS-CO2",
    "categorie": "vmc",
    "nom": "Atlantic Optimocosy HR Plus avec CO2 — double flux",
    "marque": "Atlantic",
    "prix_ht": 4006.67,
    "unite": "unite",
    "caracteristiques": {
      "reference_fabricant": "412259",
      "type_flux": "double",
      "pilotage": "CO2",
      "prix_fournisseur_ht": 4006.67
    }
  }
]
$products$::jsonb)
  LOOP
    SELECT id INTO v_id
    FROM public.catalogue_produits
    WHERE entreprise_id = v_entreprise AND reference = p->>'reference'
    ORDER BY created_at NULLS FIRST
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id, categorie, nom, marque, reference, description, caracteristiques,
        prix_unitaire_ht, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee, actif, public_cible
      ) VALUES (
        v_entreprise, p->>'categorie', p->>'nom', COALESCE(p->>'marque',''), p->>'reference',
        COALESCE(p->>'description',''), COALESCE(p->'caracteristiques','{}'::jsonb),
        CASE WHEN p->'prix_ht' IS NULL OR p->'prix_ht' = 'null'::jsonb THEN 0 ELSE (p->>'prix_ht')::numeric END,
        COALESCE(p->>'unite','unite'), 20, false, false, NULL, true, 'particulier'
      );
      v_ajoutes := v_ajoutes + 1;
    ELSE
      UPDATE public.catalogue_produits cp SET
        categorie = p->>'categorie',
        nom = p->>'nom',
        marque = COALESCE(p->>'marque', cp.marque),
        caracteristiques = COALESCE(cp.caracteristiques,'{}'::jsonb) || COALESCE(p->'caracteristiques','{}'::jsonb),
        prix_unitaire_ht = CASE
          WHEN p->'prix_ht' IS NULL OR p->'prix_ht' = 'null'::jsonb THEN CASE WHEN COALESCE((p->'caracteristiques'->>'prix_a_renseigner')::boolean, false) THEN 0 ELSE cp.prix_unitaire_ht END
          ELSE (p->>'prix_ht')::numeric
        END,
        unite = COALESCE(p->>'unite',cp.unite),
        actif = true
      WHERE cp.id = v_id;
      v_maj := v_maj + 1;
    END IF;
    v_id := NULL;
  END LOOP;

  RAISE NOTICE 'Compléments solaire thermique / SSC / VMC : % ajout(s), % mise(s) à jour', v_ajoutes, v_maj;
END $;

-- Classement des sous-catégories de Production d’électricité.
-- Les kits photovoltaïques intégrant une batterie restent des kits PV ; seuls les produits
-- de stockage autonomes sont déplacés vers batterie_stockage.
UPDATE public.catalogue_produits
SET categorie = 'batterie_stockage'
WHERE entreprise_id = (SELECT id FROM public.entreprises ORDER BY created_at LIMIT 1)
  AND (
    reference IN ('BAT-512-MONO', 'BAT-1024-MONO', 'BAT-1024-TRI', 'RENON-512-ADD')
    OR (categorie = 'photovoltaique' AND lower(coalesce(nom,'')) LIKE 'stockage batterie%')
  );

-- Les accessoires de pilotage énergétique Comwatt sont rangés dans Domotique.
UPDATE public.catalogue_produits
SET categorie = 'domotique'
WHERE entreprise_id = (SELECT id FROM public.entreprises ORDER BY created_at LIMIT 1)
  AND reference IN ('COMPACT-GEN4', 'MODULE-SG-READY', 'SMARTPLUG-GEN4');

