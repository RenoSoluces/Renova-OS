-- Reno Soluces — tarifs ITE communiqués le 18/10/2026.
-- Les montants sont enregistrés en HT : prix_unitaire_ht = fourniture,
-- forfait_pose_ht = pose/accessoires. La TVA est appliquée par le devis.
-- Pour les références vendues seules dans la source, le total HT est la somme
-- fourniture + forfait de pose/accessoires indiqué par Reno Soluces.

UPDATE catalogue_produits SET
  prix_unitaire_ht = v.fourniture,
  forfait_pose_ht = v.pose,
  tva_taux = v.tva,
  caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) || jsonb_build_object(
    'prix_fourniture_ht_m2', v.fourniture,
    'prix_pose_accessoires_ht_m2', v.pose,
    'prix_total_ht_m2', v.fourniture + v.pose,
    'tarif_source', 'Tarif communiqué par Reno Soluces le 18/10/2026'
  )
FROM (VALUES
  ('35343', 'Hirsch Graphipan ITE TH32 — 140 mm', 49.95::numeric, 45.00::numeric, 5.5::numeric),
  ('ECOBILLES-200', 'Écobilles Inject-Styrène Diffusion — 200 mm', 53.00::numeric, 55.00::numeric, 5.5::numeric),
  ('2816688', 'Knauf Therm ITEx TH38 SE — 140 mm', 19.00::numeric, 36.00::numeric, 20::numeric),
  ('2816743', 'Knauf XTherm ITEx Sun+ graphité — 120 mm', 24.00::numeric, 38.00::numeric, 20::numeric),
  ('2816745', 'Knauf XTherm ITEx Sun+ graphité — 140 mm', 27.00::numeric, 40.00::numeric, 20::numeric),
  ('PRB FACADE TH 38', 'Panneau PSE PRB FACADE TH 38 — 170 mm', 32.00::numeric, 43.00::numeric, 20::numeric),
  ('239630', 'Rockwool Ecorock Mono — 134 mm', 25.42::numeric, 40.00::numeric, 5.5::numeric),
  ('102713', 'Rockwool Rockfaçade — 130 mm', 17.89::numeric, 45.00::numeric, 20::numeric),
  ('100545', 'Rockwool Rockfaçade — 150 mm', 20.65::numeric, 47.00::numeric, 20::numeric),
  ('346881', 'Rockwool Rockfaçade Premium — 120 mm', 25.02::numeric, 45.00::numeric, 20::numeric),
  ('13056', 'Isover Isofaçade 30P — 120 mm', 20.71::numeric, 38.00::numeric, 5.5::numeric),
  ('87220', 'Isover Isofaçade 32R — 120 mm', 25.00::numeric, 38.00::numeric, 20::numeric),
  ('656159', 'Knauf Insulation Smartfaçade 32 BR — 120 mm', 21.52::numeric, 38.00::numeric, 20::numeric),
  ('656234', 'Knauf Insulation Smartfaçade 35 BR — 140 mm', 16.72::numeric, 40.00::numeric, 20::numeric),
  ('235043', 'Soprema Efigreen ITE — 82 mm', 24.98::numeric, 38.00::numeric, 5.5::numeric),
  ('231110', 'Soprema Pavawall Smart — 145 mm', 41.00::numeric, 48.00::numeric, 20::numeric)
) AS v(reference, nom, fourniture, pose, tva)
WHERE catalogue_produits.categorie = 'ite'
  AND (catalogue_produits.reference = v.reference OR catalogue_produits.nom = v.nom);

-- Le produit générique « Isolation » fait doublon avec les gestes et isolants
-- détaillés. On le désactive plutôt que de le supprimer, pour préserver les devis historiques.
UPDATE catalogue_produits
SET actif = false
WHERE lower(trim(nom)) = 'isolation'
  AND categorie IN ('combles', 'murs', 'ite', 'plancher', 'menuiseries', 'autre')
  AND COALESCE(catalogue_groupe, 'particulier') = 'particulier';
