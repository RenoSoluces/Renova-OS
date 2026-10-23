# Renova OS — intégration ITE (18 octobre 2026)

## Catalogue

Ajout d'une catégorie distincte `ite` (« Isolation par l’extérieur (ITE) ») et de 18 fiches :

- PRB FACADE TH 38 / gamme THERMOLOOK EMI ANCIEN, PSE 170 mm
- Inject-Styrène Diffusion — écobilles 200 mm
- Rockwool Ecorock Mono 134 mm
- Soprema Efigreen ITE 82 mm
- Hirsch Graphipan ITE TH32 140 mm
- Isover Isofaçade 30P 120 mm et Isofaçade 32R 120 mm
- Knauf Therm ITEx TH38 SE 140 mm
- Knauf XTherm ITEx Sun+ 120 mm et 140 mm
- Soprema Pavawall Smart 145 mm
- Rockwool Rockfaçade 130 mm et 150 mm, Rockfaçade Premium 120 mm
- Knauf Insulation Smartfaçade 35 BR 140 mm et 32 BR 120 mm
- Échafaudage de façade (montage, location, démontage)
- Enduit de façade monocouche teinté, finition grattée

## Devis

- Le récapitulatif du devis dans l'application affiche un bandeau par famille de travaux.
- Le PDF comporte le même type de bandeau au début de chaque nouvelle famille.
- Les lignes de prestations non directement liées à un produit (ex. échafaudage/enduit) restent sous la dernière famille de travaux choisie tant que la famille ne change pas.
- La catégorie est calculée à partir du produit du catalogue côté client; aucune colonne supplémentaire n'est ajoutée à `devis_lignes`.

## Précautions

- Prix unitaires des matériaux laissés à 0 € HT, à saisir après validation du tarif commercial. Les montants issus du devis exemple ne sont pas convertis en prix catalogue. Les deux prestations dont le prix a été explicitement fourni sont préremplies à 24 € HT/m² pour l’échafaudage et 72 € HT/m² pour l’enduit, TVA affichée à 10 % comme dans la source; à confirmer selon chantier.
- Le taux de TVA des matériaux est une valeur par défaut (20 %) et doit être ajusté au chantier. Les taux indiqués pour échafaudage/enduit (10 %) reprennent les données communiquées et doivent également être vérifiés selon la prestation et le chantier.
- Aucune éligibilité CEE/MaPrimeRénov’ n'est déclarée automatiquement. La fiche BAR-EN-102, les certifications ACERMI, DTA, normes et domaines d'emploi doivent être vérifiés sur les documents officiels valides couvrant la référence exacte et le système complet posé.
- Les surfaces de 121,51 m² et 110 m² issues des exemples de devis ne sont pas enregistrées comme caractéristiques du produit afin de ne pas les afficher à tort sur les prochains devis.
- Le produit PU Efigreen ITE et les références/épaisseurs qui présentent des ambiguïtés restent à confirmer avec la documentation du fabricant avant usage commercial.

## Migration Supabase

Fichier : `supabase/migrations/20261018200000_catalogue_ite_complet.sql`.
La migration est idempotente sur les références renseignées et reclasse les anciennes fiches ITE de la catégorie générique « murs » lorsqu'elles sont identifiables. Elle n'a pas été appliquée à Supabase.

## Validation technique

La compilation n'a pas pu être menée à terme dans l'environnement de préparation : `npm ci` a expiré pendant le téléchargement des dépendances, puis le mode hors ligne a échoué faute d'un paquet disponible dans le cache (`yallist`). À exécuter sur le poste de développement avec `npm ci`, puis `npm run build`, avant tout commit ou déploiement.


## Correctif — classement Isolation et prime CEE ITE

- La catégorie ITE est maintenant rangée dans la section **Isolation** du catalogue particulier.
- Migration complémentaire `20261018213000_reclasser_ite_et_regle_cee_surface.sql` : reclasse les références ITE connues, y compris celles précédemment rangées dans `autre`, ainsi que l’échafaudage et l’enduit, sous `ite`.
- Le devis calcule automatiquement la prime CEE ITE selon le profil du prospect : Bleu = 12 €/m² ; Jaune/Violet/Rose = 8 €/m². La quantité vient des lignes de produits isolants ITE et exclut échafaudage, enduit et écobilles injectées. Exemple : 50 m² × 12 € = 600 €.
- La règle de prime est celle communiquée par Reno Soluces et n’est pas une affirmation d’un barème national universel.
