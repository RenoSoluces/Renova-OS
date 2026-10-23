# Renova OS — évolutions Devis & Catalogue (16 octobre 2026)

## Devis
- Reprise de l’atelier devis avec une mise en page plus structurée : zone de sélection du catalogue, composition du devis et aperçu A4 actualisé en direct.
- Ajout de champs Marque et Référence sur les lignes de devis et reprise de ces informations dans les caractéristiques exportées.
- Ajout d’une prévisualisation lisible, des totaux, des aides saisies et des actions d’enregistrement / génération PDF en réutilisant les fonctions et données existantes de Renova OS.
- Ajustements de responsive pour les écrans plus étroits.

## Catalogue
- Ajout de compteurs synthétiques (références, actifs, CEE, MaPrimeRénov’).
- Amélioration visuelle des filtres, regroupements et lignes de produits.
- Ajout d’une fiche produit dédiée qui rassemble identification, tarifs, TVA, zones tarifaires, caractéristiques et indicateurs d’aides.
- Réorganisation du formulaire d’ajout / modification en sections : identité, caractéristiques, tarification, aides et tarifs géographiques.
- Conservation des opérations existantes : ajout, modification, duplication, activation/désactivation, suppression et export PDF.

## Correctifs déjà présents dans la base de travail
Les fichiers modifiés du correctif précédent (prospects, dossiers, types, fonction de notification et migration SQL) ont été conservés dans cette version.

## Validation
- Vérification TypeScript : `tsc -b` réussit dans l’environnement de contrôle.
- La compilation Vite complète n’a pas pu être confirmée dans cet environnement Linux car le ZIP fourni contenait des dépendances `node_modules` Windows et ne contenait pas le module optionnel Rollup Linux. Sur le poste de développement, exécuter `npm install` puis `npm run build`.

## Important
Le moteur de conformité complet du prototype HTML n’a pas été recopié tel quel : le code fourni dépendait d’un objet de démonstration `D` (catalogue, règles et champs non joints) et contenait des règles réglementaires datées qui doivent être vérifiées avant d’être utilisées pour bloquer un vrai devis. Cette version utilise le catalogue, les devis, les montants et les fonctions existants de Renova OS sans injecter de faux produits ou de règles non validées.
