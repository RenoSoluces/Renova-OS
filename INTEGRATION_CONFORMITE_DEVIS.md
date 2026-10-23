# Intégration conformité devis — 18/10/2026

- Ajout des composants `ConformitePanel`, `LigneFicheFields` et `SectionsConformite`.
- Ajout du moteur de champs de fiche CEE et des contrôles de dossier dans `src/lib/devis/`.
- Intégration des composants dans `DevisPage.tsx`.
- Ajout de la catégorie `ite` dans le sélecteur Isolation.
- Conservation du calcul CEE ITE existant (barème interne Reno Soluces : Bleu 12 €/m² ; autres profils 8 €/m² ; exclusions échafaudage/enduit/injection/écobilles).
- Enregistrement des métadonnées de conformité dans `devis.conformite_devis` via une migration SQL fournie.
- La signature et l'envoi sont bloqués si les contrôles marqués bloquants ne sont pas renseignés.

## Vérification
Le build n'a pas pu être validé dans cet environnement : l'installation des dépendances a expiré et `npm run build` signale des définitions de types manquantes dans `node_modules` (notamment React et plusieurs types transitifs). Exécuter `npm install` puis `npm run build` dans l'environnement du projet avant déploiement.

Les contrôles du moteur sont des contrôles de saisie à confirmer avec les fiches officielles applicables ; ils ne constituent pas une validation réglementaire automatique.
