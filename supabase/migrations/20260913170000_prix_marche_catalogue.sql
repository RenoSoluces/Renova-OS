/*
# Remplissage du catalogue avec des prix de marché 2026

Met à jour les produits déjà créés par le script de pré-remplissage précédent
(seed_catalogue_produits.sql) avec :
- une marque représentative du marché français (à titre d'exemple : à
  remplacer par votre fournisseur réel si différent — la "référence" reste
  volontairement vide, à compléter avec le modèle exact que vous achetez) ;
- un prix fourniture (prix_unitaire_ht) basé sur les fourchettes moyennes
  observées sur le marché français en 2026 (ADEME, CAPEB, comparateurs
  spécialisés) ;
- un forfait pose et un forfait évacuation des déchets, dans la même unité
  que le produit ;
- un taux de TVA et une éligibilité MaPrimeRénov' à jour de la réforme du
  1er septembre 2026 (décret n° 2026-822).

⚠️ CE SONT DES PRIX MOYENS DE MARCHÉ, PAS VOS PRIX. Chaque ligne reste
modifiable ensuite dans Catalogue > modifier. Ajustez-les selon vos
fournisseurs réels, votre région et vos marges avant de les utiliser en
devis. Le taux de TVA à 5,5% suppose un logement de plus de 2 ans et une
pose par un professionnel RGE ; il ne préjuge pas de l'éligibilité aux aides.

Rejouable sans risque : ne met à jour que les lignes déjà présentes
(identifiées par nom + catégorie), n'en crée aucune nouvelle.
*/

UPDATE catalogue_produits cp SET
  marque = v.marque,
  prix_unitaire_ht = v.prix_unitaire_ht,
  forfait_pose_ht = v.forfait_pose_ht,
  forfait_evacuation_ht = v.forfait_evacuation_ht,
  tva_taux = v.tva_taux,
  eligible_mpr = v.eligible_mpr
FROM (VALUES
  -- Isolation combles / rampants
  ('combles', 'Isolation combles perdus — laine de verre soufflée', 'Isover', 12,  14,   1,  5.5, false),
  ('combles', 'Isolation combles perdus — ouate de cellulose soufflée', 'Isover', 15,  15,   1,  5.5, false),
  ('combles', 'Isolation rampants — laine de verre sous rampants', 'Isover', 45,  40,   2,  5.5, false),
  ('combles', 'Isolation sarking', 'Isover', 110, 80,   3,  5.5, false),

  -- Isolation murs
  ('murs', 'ITE — Isolation thermique par l''extérieur (polystyrène + enduit)', 'Knauf', 70,  82,   4,  5.5, false),
  ('murs', 'ITE — Isolation thermique par l''extérieur (laine de roche + enduit)', 'Rockwool', 90,  100,  4,  5.5, false),
  ('murs', 'ITI — Doublage isolant sur murs (placo + laine de verre)', 'Isover', 18,  20,   3,  5.5, false),
  ('murs', 'Isolation murs par insufflation (murs creux)', 'Isover', 12,  16,   2,  5.5, false),

  -- Isolation plancher bas
  ('plancher', 'Isolation plancher bas — sous-face polystyrène', 'Knauf', 15,  18,   2,  5.5, false),
  ('plancher', 'Isolation plancher bas — laine de roche sous-face', 'Rockwool', 18,  20,   2,  5.5, false),
  ('plancher', 'Isolation vide sanitaire', 'Isover', 12,  16,   2,  5.5, false),

  -- Menuiseries
  ('menuiseries', 'Fenêtre PVC double vitrage — pose standard', 'K•Line', 285, 180,  30, 5.5, false),
  ('menuiseries', 'Fenêtre aluminium double vitrage — pose standard', 'Technal', 550, 200,  30, 5.5, false),
  ('menuiseries', 'Porte d''entrée isolante', 'K•Line', 1100, 250,  30, 5.5, false),
  ('menuiseries', 'Volet roulant isolant', 'Bubendorff', 280, 95,   15, 20,  false),

  -- Pompe à chaleur Air/Eau (reste éligible MaPrimeRénov' en geste isolé)
  ('pac_air_eau', 'PAC Air/Eau monobloc', 'Atlantic', 9300, 1120, 100, 5.5, true),
  ('pac_air_eau', 'PAC Air/Eau bi-bloc', 'Atlantic', 8000, 960,  100, 5.5, true),
  ('pac_air_eau', 'PAC Air/Eau haute température', 'Atlantic', 11000, 1320, 100, 5.5, true),

  -- Pompe à chaleur Air/Air
  ('pac_air_air', 'PAC Air/Air mono-split', 'Daikin', 3600, 180,  30, 5.5, false),
  ('pac_air_air', 'PAC Air/Air multi-split (2 unités)', 'Daikin', 5800, 350,  30, 5.5, false),
  ('pac_air_air', 'PAC Air/Air multi-split (3 unités)', 'Daikin', 8100, 450,  30, 5.5, false),

  -- Pompe à chaleur géothermique (reste éligible MaPrimeRénov' en geste isolé)
  ('pac_geothermie', 'PAC géothermique sol/eau', 'Viessmann', 13500, 4500, 150, 5.5, true),

  -- Ballon thermodynamique
  ('ballon_thermodynamique', 'Ballon thermodynamique 200L', 'Atlantic', 1400, 500,  50, 5.5, false),
  ('ballon_thermodynamique', 'Ballon thermodynamique 270L', 'Atlantic', 1700, 575,  50, 5.5, false),
  ('ballon_thermodynamique', 'Ballon thermodynamique sur air extrait', 'Atlantic', 2700, 855,  50, 5.5, false),

  -- VMC
  ('vmc', 'VMC simple flux hygroréglable type B', 'Aldes', 750,  290,  20, 5.5, false),
  ('vmc', 'VMC double flux avec échangeur', 'Aldes', 3500, 1240, 30, 5.5, false),

  -- Photovoltaïque (prix par kWc — seuil TVA réduite désormais 9 kWc)
  ('photovoltaique', 'Panneaux photovoltaïques — installation ≤ 3 kWc', 'DualSun', 1230, 820, 0, 5.5, false),
  ('photovoltaique', 'Panneaux photovoltaïques — installation 3 à 9 kWc', 'DualSun', 995,  665, 0, 5.5, false),
  ('photovoltaique', 'Micro-onduleur (par panneau)', 'Enphase', 150,  40,  0, 5.5, false),
  ('photovoltaique', 'Batterie de stockage résidentielle', 'Enphase', 3500, 665, 0, 20,  false),

  -- Autre
  ('autre', 'Étude thermique / audit énergétique', '', 500, 0, 0, 20, false),
  ('autre', 'Frais de dossier aides financières', '', 250, 0, 0, 20, false),
  ('autre', 'Ramonage / entretien chaudière', '', 100, 0, 0, 20, false)
) AS v(categorie, nom, marque, prix_unitaire_ht, forfait_pose_ht, forfait_evacuation_ht, tva_taux, eligible_mpr)
WHERE cp.nom = v.nom AND cp.categorie = v.categorie;
