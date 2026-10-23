# Harmonisation des descriptions de tous les produits — 21/10/2026

## But
La description du catalogue ne doit plus contenir les caractéristiques techniques qui sont déjà reprises dans les champs dédiés au devis.

- **Description** : phrase courte expliquant l’usage/la destination du produit.
- **Caractéristiques exigées par la fiche** : restent dans les champs de fiche CEE associés au produit.
- **Autres caractéristiques techniques** : restent dans `caracteristiques`, sans être recopiées dans la description.
- Les prix, forfaits de pose, frais d’évacuation, références du catalogue, TVA, catégories et indicateurs d’éligibilité ne sont pas modifiés.

## Couverture
La migration met à jour toutes les lignes existantes de `public.catalogue_produits`, sans liste figée de références. Elle couvre les catégories connues (combles perdus, rampants, ITE, plancher bas, PAC air/eau, PAC air/air, géothermie, ballon thermodynamique, solaire thermique, photovoltaïque, batteries, VMC, menuiseries, équipements professionnels et visites techniques) et prévoit une description de repli pour toute catégorie personnalisée ou tout futur produit.

Les fonctions spécifiques connues de Comwatt (Module SG Ready et SmartPlug) sont traitées explicitement.

## Conservation des informations techniques
Avant la réécriture, les anciennes descriptions sont archivées dans `public.catalogue_descriptions_archive`, une ligne par produit. La table est protégée par RLS sans politique de lecture applicative ; elle n’est pas affichée sur les devis.

La migration récupère aussi, lorsque ces valeurs sont présentes et qu’aucune caractéristique équivalente n’est déjà renseignée, plusieurs données structurées reconnues dans l’ancien texte : résistance thermique R, épaisseur, dimensions, conductivité thermique, norme, numéro ACERMI, DTA, Euroclasse, COP et SCOP. Les caractéristiques déjà présentes restent prioritaires. Les éléments qui ne peuvent pas être extraits sans ambiguïté restent conservés dans l’archive au lieu d’être transformés en données potentiellement fausses.

## Limite importante
La migration ne prétend pas vérifier les performances, certifications ou éligibilités réglementaires. Elle ne crée aucune valeur technique : seules les valeurs effectivement reconnues dans l’ancienne description peuvent être reclassées automatiquement.

## Application
La migration doit être appliquée à la base Supabase cible après vérification du projet actif. Le ZIP contient le correctif ; il ne modifie pas la base Supabase à distance et ne lance pas de déploiement.
