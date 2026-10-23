-- Nettoyage des descriptions visibles du catalogue : les tarifs, forfaits de pose,
-- références CEE et autres données de conformité restent dans leurs champs dédiés.
-- Aucun prix ni caractéristique réglementaire n'est modifié par cette migration.
UPDATE catalogue_produits
SET description = CASE reference
  WHEN 'COMBLES-PULSR-FORFAIT' THEN 'Isolation des combles perdus par soufflage d’un isolant en vrac. La résistance thermique finale dépend du produit effectivement utilisé, de son épaisseur mise en œuvre et des conditions de pose ; à confirmer avant de valider les performances du chantier.'
  WHEN 'ISOVER-COMBLISSIMO-R7' THEN 'Laine minérale en vrac destinée à l’isolation des combles perdus par soufflage. Valeur R catalogue indiquée dans les caractéristiques du produit ; vérifier l’épaisseur et la résistance thermique de la mise en œuvre réelle.'
  WHEN 'ROCKWOOL-JETROCK2-R7' THEN 'Laine minérale en vrac destinée à l’isolation des combles perdus par soufflage. Valeur R catalogue indiquée dans les caractéristiques du produit ; vérifier l’épaisseur et la résistance thermique de la mise en œuvre réelle.'
  WHEN 'URSA-PULSR47-R7' THEN 'Isolant en laine minérale en vrac destiné à l’isolation des combles perdus par soufflage. Vérifier la référence commerciale exacte, l’épaisseur mise en œuvre et la résistance thermique du système posé.'
  WHEN 'KNAUF-THERMOLOFT-R7' THEN 'Laine minérale en vrac destinée à l’isolation des combles perdus par soufflage. Valeur R catalogue indiquée dans les caractéristiques du produit ; vérifier l’épaisseur et la résistance thermique de la mise en œuvre réelle.'
  WHEN 'SOPREMA-UNIVERCELL-CRISTAL-R7' THEN 'Ouate de cellulose en vrac destinée à l’isolation des combles perdus par soufflage. Vérifier l’épaisseur mise en œuvre et la résistance thermique du système posé.'
  WHEN 'VOLCALIS-EASY-LAINE-MINERALE' THEN 'Isolant en laine minérale en rouleaux destiné à l’isolation des combles perdus par déroulage. La résistance thermique dépend de la référence et de l’épaisseur réellement posées ; à confirmer à partir de la fiche technique fabricant.'
  WHEN 'ISOVER-IBR-NU-300-R750' THEN 'Rouleau de laine de verre nu destiné à l’isolation des combles perdus. Épaisseur catalogue : 300 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'ISOVER-IBR-KRAFT-300-R750' THEN 'Rouleau de laine de verre avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 300 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'ISOVER-IBR-KRAFT-400-R1000' THEN 'Rouleau de laine de verre avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 400 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'URSA-MRK35-KRAFT-280-R800' THEN 'Rouleau de laine minérale avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 280 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'URSA-MRK40-KRAFT-300-R750' THEN 'Rouleau de laine minérale avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 300 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'KNAUF-TI212-KRAFT-280-R700' THEN 'Rouleau de laine minérale avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 280 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'KNAUF-TI212-KRAFT-300-R750' THEN 'Rouleau de laine minérale avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 300 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  WHEN 'KNAUF-TI216-KRAFT-370-R1000' THEN 'Rouleau de laine minérale avec parement kraft destiné à l’isolation des combles perdus. Épaisseur catalogue : 370 mm. Vérifier la référence exacte et les conditions de pose à partir de la fiche technique fabricant.'
  ELSE description
END
WHERE reference IN (
  'COMBLES-PULSR-FORFAIT','ISOVER-COMBLISSIMO-R7','ROCKWOOL-JETROCK2-R7',
  'URSA-PULSR47-R7','KNAUF-THERMOLOFT-R7','SOPREMA-UNIVERCELL-CRISTAL-R7',
  'VOLCALIS-EASY-LAINE-MINERALE','ISOVER-IBR-NU-300-R750','ISOVER-IBR-KRAFT-300-R750',
  'ISOVER-IBR-KRAFT-400-R1000','URSA-MRK35-KRAFT-280-R800','URSA-MRK40-KRAFT-300-R750',
  'KNAUF-TI212-KRAFT-280-R700','KNAUF-TI212-KRAFT-300-R750','KNAUF-TI216-KRAFT-370-R1000'
);
