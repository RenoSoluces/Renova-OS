-- Prix conditionnels par zone géographique : certains produits (transport, main
-- d'oeuvre incluse) coûtent différemment selon la zone d'intervention. `zones_prix`
-- stocke une liste de dérogations tarifaires par zone (ex: code département) qui
-- remplacent le prix de base `prix_unitaire_ht` quand le prospect est situé dans la
-- zone concernée ; si aucune dérogation ne correspond, le prix de base s'applique.
--
-- Format : [{ "zone": "75", "prix_unitaire_ht": 145 }, { "zone": "13", "prix_unitaire_ht": 132 }]
-- `zone` est un préfixe de code postal (2 chiffres pour la métropole, 3 pour les DOM).

ALTER TABLE catalogue_produits
  ADD COLUMN IF NOT EXISTS zones_prix jsonb NOT NULL DEFAULT '[]'::jsonb;
