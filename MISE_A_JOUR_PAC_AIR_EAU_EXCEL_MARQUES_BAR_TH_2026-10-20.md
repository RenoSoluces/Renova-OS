# Mise à jour PAC air/eau — 20 octobre 2026

## Source utilisée
Classeur `Renova_prix_pose_fourniture_aides.xlsx`, onglet `PAC air-eau`.

## Catalogue
- Les 12 packs/modèles listés dans le classeur sont ajoutés ou mis à jour.
- Fourniture HT et forfait de pose HT restent deux champs distincts (`prix_unitaire_ht` et `forfait_pose_ht`).
- Fiche CEE renseignée : `BAR-TH-171` (version mentionnée dans le classeur : vA82-5 depuis le 01/09/2026).
- Les champs d'aides et paramètres de calcul issus du classeur sont conservés dans les caractéristiques du produit.
- Les autres références et composants déjà importés ne reçoivent pas un forfait de pose arbitraire. Ils portent la référence de fiche BAR-TH-171, mais ne sont pas déclarés éligibles individuellement par cette migration.

## Aides (valeurs du classeur, à vérifier dossier par dossier)
- MaPrimeRénov' par geste : 5 000 € Bleu, 4 000 € Jaune, 3 000 € Violet ; profil Rose exclu selon la note du classeur.
- Plafond de dépense indiqué : 12 000 € HT ; COP minimal indiqué : 3,8.
- CEE calculé dans le classeur à partir de 90,9 MWhc × 6 €/MWhc : 545,40 € avec coefficient 1 et 2 727 € avec coefficient 5.
- Le classeur précise que les CEE varient selon l'ETAS, la zone climatique, la surface chauffée, le type de logement et le remplacement d'une chaudière fossile. Les valeurs sont donc des estimations et non une promesse d'aide.
- Écrêtement MPR + CEE du classeur : 90 % Bleu, 75 % Jaune, 60 % Violet ; TVA indicative 5,5 %.

## Interface
Quand la catégorie `Pompe à chaleur Air/Eau` est sélectionnée, des filtres par marque sont affichés avec le nombre de produits par marque. `Toutes les marques` réinitialise le filtre.

## Déploiement / vérification
- Migration SQL ajoutée : `supabase/migrations/20261020090000_pac_air_eau_excel_prix_pose_aides_bar_th.sql`.
- La migration n'a pas été appliquée à Supabase.
- Le build TypeScript/Vite n'a pas été exécuté dans cet environnement (dépendances `node_modules` absentes).

Les six options HT listées en note dans le classeur (désembouage 450 €, ballon tampon + groupe de sécurité 650 €, dépose chaudière + évacuation 400 €, neutralisation cuve fioul 450 €, deuxième zone/vanne 3 voies 700 €, socle béton 250 €) sont aussi stockées dans les caractéristiques des packs pour ne pas les perdre. Elles ne sont pas automatiquement ajoutées au devis.
