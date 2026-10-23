# Mise à jour catalogue — PAC air/air, géothermie et photovoltaïque
Date : 20 octobre 2026

Source : `Renova_prix_pose_fourniture_aides.xlsx`, transmis par Reno Soluces.

## Données intégrées

- **PAC air/air : 200 lignes** de l’onglet correspondant. Prix de fourniture HT, compléments HT et forfait de pose HT sont repris séparément. Fiche indiquée : BAR-TH-129. MaPrimeRénov’ est à 0 selon le classeur ; le CEE n’est pas chiffré dans le classeur et doit être calculé pour chaque dossier. La TVA de 10 % est reprise comme valeur indicative à valider.
- **PAC géothermique : 3 configurations** de l’onglet correspondant. Fourniture HT et pose HT séparées. Fiche indiquée : BAR-TH-172. MaPrimeRénov’ : 11 000 € Bleu, 9 000 € Jaune, 6 000 € Violet. Les CEE 2 500 € / 4 000 € sont explicitement stockés comme hypothèses non vérifiées. Le classeur indique que BAR-TH-172 n’est pas encore intégré au moteur de conformité.
- **Photovoltaïque : 13 configurations** de 1 à 18 kWc. Les coûts sont calculés à partir des paramètres de l’onglet : panneau DMEGC 500 Wc à 105 € HT, micro-onduleur APS DS3-H à 200 € HT pour deux panneaux, Comwatt 1 800 € HT, coffret 280 € HT, fixations 45 € HT/panneau, pose 1 000 € HT + 80 € HT/panneau. Coefficient de marge du classeur : 1. Les prix sont des estimations de ce classeur, pas des devis fournisseur. Aucune fiche CEE ni MaPrimeRénov’ n’est déclarée ; prime d’autoconsommation à 0 selon le classeur. TVA 5,5 % jusqu’à 9 kWc et 20 % au-delà, à valider avec le comptable.

## Interface catalogue

Le filtre par marque est désormais disponible lorsque l’on sélectionne PAC air/eau, PAC air/air, PAC géothermique ou Photovoltaïque. Les noms de marques et les compteurs sont générés depuis les produits présents dans la catégorie.

## Précautions et vérifications

- Les prix de fourniture et les forfaits de pose restent dans deux champs séparés.
- Pour les produits air/air dont le prix de fourniture est à renseigner (zéro dans le classeur), une mise à jour d’un produit déjà présent ne remplace pas son prix existant par zéro.
- Les paramètres d’aides du classeur sont enregistrés avec un avertissement de vérification ; ils ne constituent pas une garantie d’éligibilité ni un calcul final de reste à charge.
- La migration SQL doit être appliquée à Supabase pour que les produits soient créés/mis à jour en base.
- Le build complet a été tenté, mais l’installation temporaire des dépendances est incomplète : `tsc` échoue sur plusieurs définitions de types manquantes (`@types/*`). Ce n’est donc pas une validation de build réussie.
