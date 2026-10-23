# Correctif catalogue — combles perdus (20/10/2026)

- Base de travail : liste de 16 produits fournie par Reno Soluces.
- Prix de fourniture : valeurs reprises exactement du condensé, en HT/m².
- Forfait pose séparé : 16 € HT/m² pour le soufflage ; 18 € HT/m² pour le déroulage.
- Le forfait d'évacuation n'est pas modifié.
- Les deux entrées Thermo Loft sont maintenues séparément, comme dans la liste reçue.
- Les références déjà créées par les migrations précédentes sont retrouvées au moyen d'alias pour éviter de dupliquer les 15 produits existants ; une entrée distincte est créée pour la référence Thermo Loft supplémentaire si elle n'existe pas.
- La fiche BAR-EN-101 est renseignée uniquement lorsque le produit a une valeur R renseignée au moins égale à 7 dans les données reçues. Cette affectation catalogue ne remplace pas la vérification de la fiche CEE en vigueur, des caractéristiques du produit réellement posé et des exigences de chantier avant de valider un dossier.
- Les données ACERMI et les consommations en sacs sont reprises du condensé utilisateur et doivent être rapprochées des documents fabricant de la référence effectivement livrée avant de les présenter comme vérifiées.

## Contrôle avant application

La migration met à jour les données de la table `catalogue_produits` au déploiement Supabase. Les prix de fourniture ne sont plus considérés comme des prix installés et `forfait_pose_ht` est alimenté séparément. Les lignes d'évacuation existantes ne sont pas écrasées.
