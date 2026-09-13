-- Forfaits pose et évacuation des déchets, rattachés à chaque produit du catalogue.
--
-- Chaque produit peut désormais porter, en plus de son prix fourniture
-- (`prix_unitaire_ht`), un prix de pose et un prix d'évacuation des déchets,
-- exprimés dans la même unité que le produit (ex : €/m² pour de l'isolation,
-- €/unité pour une PAC).
--
-- Quand un produit est ajouté à un devis (DevisPage), si ces forfaits sont
-- renseignés (> 0), deux lignes supplémentaires sont ajoutées automatiquement
-- au devis : "Pose — <produit>" et "Évacuation des déchets — <produit>",
-- avec la même quantité que la ligne produit. Si un forfait est à 0, aucune
-- ligne n'est ajoutée pour celui-ci (ex : pas d'évacuation de déchets pour un
-- panneau photovoltaïque, forfait pose global géré autrement, etc.).

ALTER TABLE catalogue_produits
  ADD COLUMN IF NOT EXISTS forfait_pose_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forfait_evacuation_ht numeric NOT NULL DEFAULT 0;
