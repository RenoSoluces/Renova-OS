# Mise à jour catalogue — batteries, accessoires photovoltaïques, produits professionnels et visites techniques
Date : 20 octobre 2026

## Batteries et accessoires photovoltaïques
- Ajout/réactivation des batteries Victron / RENON Xtreme LV et des kits photovoltaïques avec stockage issus du tarif fournisseur déjà présent dans le projet (TTC converti en HT selon la TVA source ; le tarif source précise que le prix inclut la pose, donc aucun forfait de pose supplémentaire n’est ajouté).
- Ajout de références Huawei LUNA2000-S1 et Enphase IQ Battery 5P avec prix de fourniture et pose à renseigner ; aucune valeur tarifaire n'a été inventée.
- Comwatt Module SG Ready et Comwatt SmartPlug sont déplacés dans **Panneaux photovoltaïques**. Le Comwatt COMPACT reste dans cette famille.

## Catalogue professionnel
Les configurations et tarifs HT sont repris du tableau fourni. Pour que le devis affiche correctement les totaux lorsqu'une ligne est sélectionnée avec une quantité de 1, les configurations à surface / puissance donnée sont enregistrées comme forfaits, et les prix unitaires sont conservés dans les caractéristiques.
- HP flottante : 10, 20, 30, 50 et 100 kW électriques — BAT-TH-134, étude préalable obligatoire, CEE à calculer.
- Destratificateur : lots de 1, 2, 4, 6 et 10 unités — BAT-TH-142, montants CEE non fournis.
- PAC air/eau tertiaire : 20, 40, 60 et 100 kW — BAT-TH-113 historique / à confirmer ; aucun CEE n'est promis.
- Toiture-terrasse : 200, 500, 1 000 et 2 000 m² — BAT-EN-107 ; montants CEE repris comme estimations non garanties.
- Photovoltaïque professionnel : 9, 18, 36 et 100 kWc — aucune fiche CEE / aide ajoutée.
- Combles perdus et rampants professionnels : 300 m² — BAT-EN-101 à vérifier, montant CEE non renseigné.

## Marques suggérées — références exactes à confirmer
- HP flottante : Eliwell (page officielle : https://www.eliwell.eu/fr/solutions_cee/solution-de-regulation-pour-la-hp-et-bp-flottante-ctg-1240.html).
- Batteries : Huawei LUNA2000-S1 (https://solar.huawei.com/fr/products/LUNA2000-7-14-21-S1/) et Enphase IQ Battery (https://enphase.com/fr-fr/node/16679).
- Destratificateurs : France Air, avec Soler & Palau en alternative à consulter ; modèle exact à confirmer.
- PAC tertiaire : Carrier (gammes AquaSnap pour applications commerciales/tertiaires), Daikin et Mitsubishi Electric à consulter — gamme/modèle à confirmer pour chaque puissance.
- Toitures-terrasses : ROCKWOOL, Knauf Insulation, SOPREMA (pages fabricants référencées dans les caractéristiques des produits).
- Photovoltaïque pro : DMEGC pour les modules et Huawei / Sungrow pour l'électronique de puissance ; références exactes à confirmer.
- Isolation combles/rampants : ISOVER et SOPREMA ; référence exacte à confirmer.

## Visites techniques
- Les prestations de visite technique qui se trouvaient dans `autre` sont reclassées en catégories VT.
- Sous l'onglet **Visites Techniques**, l'interface propose maintenant un filtre **Particuliers** / **Professionnels** / **Tous les publics**.
- Les visites photovoltaïques sont classées côté professionnels ; les autres visites restent côté particuliers.
- Le classement conserve les catégories VT existantes pour ne pas modifier le mécanisme de qualification des visites.

## Déploiement et vérifications
- Appliquer la migration `20261020130000_catalogue_batteries_pro_vt_classement.sql` dans le bon projet Supabase.
- La migration est conçue pour être rejouable et ne supprime aucun produit.
- Les marques professionnelles sont des pistes de fabricants, pas des références de modèles certifiées. Les prix et aides restent ceux de la source ; les montants CEE vides ou à vérifier ne sont pas inventés.


Référence fabricant PAC tertiaire vérifiée : Carrier présente des gammes AquaSnap pour applications commerciales/tertiaires, avec des plages de puissance variables selon le modèle : https://www.carrier.com/commercial/fr/fr/produits-et-regulations/chauffage-climatisation/unites-reversibles-air-eau/ . Cette référence valide la présence d’une gamme fabricant, mais ne remplace pas la sélection d’un modèle adapté aux 20/40/60/100 kW.
