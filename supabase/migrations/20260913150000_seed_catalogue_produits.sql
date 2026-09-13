/*
# Pré-remplissage du catalogue produits

Ajoute une sélection de produits/prestations courantes en rénovation énergétique,
classées par catégorie, avec les codes CEE et taux de TVA habituels déjà renseignés.

Le prix unitaire HT est volontairement laissé à 0 : il n'y a plus qu'à ouvrir
chaque fiche dans Catalogue > modifier, et à saisir votre prix.

Ce script est rejouable sans risque : chaque ligne n'est insérée que si un
produit du même nom, dans la même catégorie, n'existe pas déjà (donc si vous
avez déjà ajouté certains produits à la main, ils ne seront pas dupliqués).

⚠️ Les codes CEE (BAR-XX-XXX), l'éligibilité MaPrimeRénov et les taux de TVA
indiqués sont ceux généralement applicables, mais dépendent de votre
certification RGE, de la nature exacte des travaux et de la situation du
client (résidence principale, ancienneté du logement, etc.). Vérifiez-les
avant la première utilisation en devis.
*/

WITH e AS (
  SELECT id AS entreprise_id FROM entreprises ORDER BY created_at LIMIT 1
),
produits(categorie, nom, marque, reference, description, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee) AS (
  VALUES
  -- Isolation combles / rampants
  ('combles', 'Isolation combles perdus — laine de verre soufflée', '', '', 'Soufflage laine minérale, R ≥ 7 m².K/W', 'm2', 5.5, true, true, 'BAR-EN-101'),
  ('combles', 'Isolation combles perdus — ouate de cellulose soufflée', '', '', 'Isolant biosourcé soufflé, R ≥ 7 m².K/W', 'm2', 5.5, true, true, 'BAR-EN-101'),
  ('combles', 'Isolation rampants — laine de verre sous rampants', '', '', 'Pose entre/sous chevrons, R ≥ 6 m².K/W', 'm2', 5.5, true, true, 'BAR-EN-101'),
  ('combles', 'Isolation sarking', '', '', 'Isolation par l''extérieur en toiture, panneaux rigides', 'm2', 5.5, true, true, 'BAR-EN-101'),

  -- Isolation murs
  ('murs', 'ITE — Isolation thermique par l''extérieur (polystyrène + enduit)', '', '', 'R ≥ 3,7 m².K/W, finition enduit taloché', 'm2', 5.5, true, true, 'BAR-EN-102'),
  ('murs', 'ITE — Isolation thermique par l''extérieur (laine de roche + enduit)', '', '', 'R ≥ 3,7 m².K/W, finition enduit', 'm2', 5.5, true, true, 'BAR-EN-102'),
  ('murs', 'ITI — Doublage isolant sur murs (placo + laine de verre)', '', '', 'R ≥ 3,7 m².K/W, pose sur ossature', 'm2', 5.5, true, true, 'BAR-EN-102'),
  ('murs', 'Isolation murs par insufflation (murs creux)', '', '', 'Insufflation isolant dans lame d''air existante', 'm2', 5.5, true, true, 'BAR-EN-102'),

  -- Isolation plancher bas
  ('plancher', 'Isolation plancher bas — sous-face polystyrène', '', '', 'Panneaux collés/chevillés en sous-face, R ≥ 3 m².K/W', 'm2', 5.5, true, true, 'BAR-EN-103'),
  ('plancher', 'Isolation plancher bas — laine de roche sous-face', '', '', 'R ≥ 3 m².K/W', 'm2', 5.5, true, true, 'BAR-EN-103'),
  ('plancher', 'Isolation vide sanitaire', '', '', 'Isolation par soufflage ou panneaux en vide sanitaire', 'm2', 5.5, true, true, 'BAR-EN-103'),

  -- Menuiseries
  ('menuiseries', 'Fenêtre PVC double vitrage — pose standard', '', '', 'Uw ≤ 1,3 W/m².K, Sw ≥ 0,3', 'unite', 5.5, true, true, 'BAR-EN-104'),
  ('menuiseries', 'Fenêtre aluminium double vitrage — pose standard', '', '', 'Uw ≤ 1,3 W/m².K, Sw ≥ 0,3', 'unite', 5.5, true, true, 'BAR-EN-104'),
  ('menuiseries', 'Porte d''entrée isolante', '', '', 'Ud ≤ 1,7 W/m².K', 'unite', 5.5, true, true, 'BAR-EN-104'),
  ('menuiseries', 'Volet roulant isolant', '', '', 'Complément d''isolation menuiserie', 'unite', 5.5, false, false, ''),

  -- Pompe à chaleur Air/Eau
  ('pac_air_eau', 'PAC Air/Eau monobloc', '', '', 'COP ≥ 4, chauffage + ECS possible selon modèle', 'unite', 5.5, true, true, 'BAR-TH-104'),
  ('pac_air_eau', 'PAC Air/Eau bi-bloc', '', '', 'COP ≥ 4, unité extérieure + module hydraulique', 'unite', 5.5, true, true, 'BAR-TH-104'),
  ('pac_air_eau', 'PAC Air/Eau haute température', '', '', 'Compatible radiateurs existants, départ 65°C', 'unite', 5.5, true, true, 'BAR-TH-104'),

  -- Pompe à chaleur Air/Air
  ('pac_air_air', 'PAC Air/Air mono-split', '', '', 'Une unité intérieure', 'unite', 5.5, false, true, 'BAR-TH-129'),
  ('pac_air_air', 'PAC Air/Air multi-split (2 unités)', '', '', 'Deux unités intérieures', 'unite', 5.5, false, true, 'BAR-TH-129'),
  ('pac_air_air', 'PAC Air/Air multi-split (3 unités)', '', '', 'Trois unités intérieures', 'unite', 5.5, false, true, 'BAR-TH-129'),

  -- Pompe à chaleur géothermique
  ('pac_geothermie', 'PAC géothermique sol/eau', '', '', 'Captage horizontal ou vertical, COP ≥ 4', 'unite', 5.5, true, true, 'BAR-TH-143'),

  -- Ballon thermodynamique
  ('ballon_thermodynamique', 'Ballon thermodynamique 200L', '', '', 'COP ≥ 2,5, sur air ambiant', 'unite', 5.5, true, true, 'BAR-TH-148'),
  ('ballon_thermodynamique', 'Ballon thermodynamique 270L', '', '', 'COP ≥ 2,5, sur air ambiant', 'unite', 5.5, true, true, 'BAR-TH-148'),
  ('ballon_thermodynamique', 'Ballon thermodynamique sur air extrait', '', '', 'Couplé à la VMC', 'unite', 5.5, true, true, 'BAR-TH-148'),

  -- VMC
  ('vmc', 'VMC simple flux hygroréglable type B', '', '', 'Bouches et caisson hygroréglables', 'unite', 5.5, true, true, 'BAR-TH-127'),
  ('vmc', 'VMC double flux avec échangeur', '', '', 'Récupération de chaleur ≥ 85%', 'unite', 5.5, true, true, 'BAR-TH-113'),

  -- Photovoltaïque
  ('photovoltaique', 'Panneaux photovoltaïques — installation ≤ 3 kWc', '', '', 'Pose toiture, onduleur inclus', 'kwc', 10, false, false, ''),
  ('photovoltaique', 'Panneaux photovoltaïques — installation 3 à 9 kWc', '', '', 'Pose toiture, onduleur inclus', 'kwc', 20, false, false, ''),
  ('photovoltaique', 'Micro-onduleur (par panneau)', '', '', 'Optimisation panneau par panneau', 'unite', 20, false, false, ''),
  ('photovoltaique', 'Batterie de stockage résidentielle', '', '', 'Stockage autoconsommation', 'unite', 20, false, false, ''),

  -- Autre
  ('autre', 'Étude thermique / audit énergétique', '', '', 'Diagnostic préalable aux travaux', 'forfait', 20, false, false, ''),
  ('autre', 'Frais de dossier aides financières', '', '', 'Montage administratif MaPrimeRénov / CEE', 'forfait', 20, false, false, ''),
  ('autre', 'Ramonage / entretien chaudière', '', '', 'Prestation d''entretien annuel', 'forfait', 20, false, false, '')
)
INSERT INTO catalogue_produits (
  entreprise_id, categorie, nom, marque, reference, description,
  prix_unitaire_ht, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee, actif
)
SELECT
  e.entreprise_id, p.categorie, p.nom, p.marque, p.reference, p.description,
  0, p.unite, p.tva_taux, p.eligible_mpr, p.eligible_cee, p.fiche_cee, true
FROM produits p
CROSS JOIN e
WHERE NOT EXISTS (
  SELECT 1 FROM catalogue_produits cp
  WHERE cp.nom = p.nom AND cp.categorie = p.categorie
);
