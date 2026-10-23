# Modifications Renova OS — Devis et catalogue

## Création / édition d'un devis
- Réorganisation en atelier de création : sélection catalogue et lignes de devis à gauche, aperçu A4 en direct à droite sur grand écran.
- Ajout d'une recherche par nom, marque, référence ou description.
- Filtres par public et catégories présentés sous forme de pastilles compactes.
- Références présentées en cartes avec marque/référence, repères CEE/MaPrimeRénov', prix visible uniquement pour les rôles autorisés et bouton d'ajout.
- Les lignes, calculs existants, aides, signature, sauvegarde et génération PDF restent reliés à la logique métier existante.
- Adaptation responsive : l'aperçu se replace sous l'éditeur sur les écrans plus étroits.

## Catalogue produits
- Hiérarchie visuelle renforcée pour les statistiques, les filtres, les groupes et le tableau de références.
- Création/modification : sections mieux séparées et aperçu réactif du nom, de la marque/référence, du prix HT, de l'unité, de la TVA et du statut actif.
- Fiche produit affichée dans un panneau latéral avec identification, prix/fiscalité, caractéristiques, zones tarifaires et actions d'export/duplication/modification.
- Les données continuent d'être chargées et enregistrées dans Supabase ; aucun jeu de données fictif n'a été ajouté.

## Validation
- `tsc -b` passe.
- `npm run build` n'a pas pu aller jusqu'à Vite dans l'environnement de préparation : la dépendance native optionnelle `@rollup/rollup-linux-x64-gnu` est absente des `node_modules` fournis. Ce n'est pas une erreur TypeScript du code modifié. Relancer `npm install` dans le dossier du projet puis `npm run build` localement.
