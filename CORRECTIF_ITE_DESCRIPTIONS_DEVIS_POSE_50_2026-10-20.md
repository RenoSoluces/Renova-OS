# Correctif Renova OS — ITE, descriptions et composition du devis

## Composition attendue
Le devis ITE est composé de postes distincts :
1. Échafaudage de façade (montage/location/démontage) — tarif catalogue conservé à 24 € HT/m² échafaudé.
2. Fourniture de l'isolant — prix de fourniture mis à jour d'après la liste Reno Soluces.
3. Enduit/parement compatible avec le système isolant — poste distinct, tarif catalogue conservé à 72 € HT/m².
4. Pose de l'isolant — 50 € HT/m², ajoutée automatiquement comme ligne séparée par le code devis existant via `forfait_pose_ht`.

Les quantités d'échafaudage et d'enduit doivent être ajustées selon le chantier; elles ne sont pas nécessairement identiques à la surface isolée. La compatibilité enduit/isolant doit être vérifiée dans le document du système complet.

## Fournitures tarifées
- ROCKWOOL Ecorock Mono 134 mm : 62,01 € HT/m²
- SOPREMA Efigreen ITE 82 mm : 59,70 € HT/m²
- HIRSCH Graphipan ITE TH32 : 90,00 € HT (unité/catalogue à confirmer)
- ISOVER Isofaçade 30P 120 mm : 55,65 € HT/m²
- ISOVER Isofaçade 32R 120 mm : 23,70 € HT/m²
- KNAUF Therm ITEx TH38 SE 140 mm : prix à renseigner (non inventé)
- KNAUF XTherm ITEx Sun+ 120 mm : 23,25 € HT/m²
- KNAUF XTherm ITEx Sun+ 140 mm : 23,85 € HT/m²
- SOPREMA Pavawall Smart 145 mm : 69,60 € HT/m²
- ROCKWOOL Rockfaçade 130 mm : 16,96 € HT/m²
- ROCKWOOL Rockfaçade 150 mm : 19,57 € HT/m²
- ROCKWOOL Rockfaçade Premium 120 mm : 23,72 € HT/m²
- KNAUF Insulation Smartfaçade 32 BR 120 mm : 20,40 € HT/m²
- KNAUF Insulation Smartfaçade 35 BR 140 mm : 15,85 € HT/m²
- IsolFrance TH31 graphité 120 mm : 11,00 € HT/m²

## Description et conformité
Les descriptions de devis comprennent les données techniques communiquées (épaisseur, R et lambda lorsqu'ils sont fournis), la méthode d'emploi à confirmer et la séparation des postes. Les produits de façade ventilée ne sont pas automatiquement déclarés compatibles avec une finition sous enduit. Les numéros ACERMI, DTA/ETA, normes, classements et éligibilités CEE/MPR ne sont pas inventés ni nouvellement activés par cette migration.

## Produits génériques
Les entrées génériques ITE et ITE-PRODUIT sont désactivées sans suppression, afin de privilégier les lignes isolant + pose + échafaudage + enduit. ITINJECTION est reclassé en `murs`, car l'injection n'est pas la même technique qu'une ITE sous enduit.

## Migration
`supabase/migrations/20261020240000_catalogue_ite_descriptions_pose_50.sql`

Cette migration n'est pas appliquée à Supabase depuis le ZIP. Le build complet n'a pas été validé dans cet environnement; exécuter `npm ci` puis `npm run build` avant déploiement.
