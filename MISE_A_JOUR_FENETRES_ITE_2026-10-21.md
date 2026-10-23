# Mise à jour catalogue Renova OS — 21/10/2026

## Menuiseries
- 72 entrées reprises du catalogue fourni.
- Type enregistré dans `caracteristiques.type_menuiserie` : `fenetre`, `porte_fenetre`, `fenetre_de_toit` ou `accessoire`.
- Les catégories `menuiseries` et `menuiseries_portes` sont utilisées pour conserver la famille existante du logiciel.
- Prix de fourniture repris du catalogue source. Les prix absents sont conservés à 0 et signalés par `prix_a_renseigner=true`, sans valeur inventée.
- Uw et Sw sont enregistrés uniquement s’ils sont explicitement mentionnés dans la désignation source. Les champs manquants sont laissés nuls et signalés.
- Tarifs de pose proposés à titre provisoire dans `forfait_pose_ht` : fenêtre 180 €/m² ou 120 €/unité ; porte-fenêtre 220 €/m² ou 180 €/unité ; fenêtre de toit 350 €/unité ; accessoires 15 €/ml ou 20 €/unité. À valider avant utilisation commerciale.
- CEE BAR-EN-104 reste conditionnel et les accessoires ne sont pas marqués CEE. MPR n’est pas déclaré éligible automatiquement.

## ITE
- Échafaudage maintenu comme ligne distincte à 24 €/m² de façade échafaudée.
- Enduit maintenu comme ligne distincte à 72 €/m².
- Pose isolant ITE existante à 50 €/m² dans la migration précédente ; elle reste distincte de l’échafaudage et de l’enduit.
- Le devis doit distinguer : échafaudage, isolant, enduit/parement compatible et pose.

## Application
Exécuter la migration Supabase `20261021190000_catalogue_fenetres_72_ite_echafaudage_enduit.sql` avant de tester le catalogue. Les prix de pose des menuiseries sont des hypothèses provisoires et ne doivent pas être considérés comme tarifs validés.
