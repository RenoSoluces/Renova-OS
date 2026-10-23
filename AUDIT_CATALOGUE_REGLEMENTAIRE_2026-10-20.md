# Audit du catalogue Renova OS — 20/10/2026

## Objet

Le catalogue est chargé depuis `public.catalogue_produits` à l’ouverture de la page. Les données des quelque 700 produits ne sont pas intégralement incluses dans le ZIP source : elles résident dans Supabase. Il est donc impossible de déclarer ici que chaque fiche produit a été corrigée sans exécuter l’audit sur la base réelle.

## Correctif livré dans cette version

- Ajout d’un audit transversal côté Catalogue sur toutes les lignes chargées : description vide/trop courte, notes internes ou tarifaires dans la description, marque/référence manquante, produit déclaré CEE sans fiche identifiable, règles CEE absentes/non validées, champs réglementaires requis manquants, caractéristiques techniques absentes, prix fourniture ou forfait de pose à confirmer.
- Ajout d’un export CSV de toutes les références présentant au moins une anomalie, avec le détail des problèmes par produit.
- Le filtre « À auditer » s’appuie désormais sur cet audit global et non uniquement sur les champs manquants d’une fiche CEE déjà intégrée.
- Les valeurs réglementaires ne sont pas inventées pour faire disparaître les alertes. Les fiches qui ne sont pas intégrées doivent être vérifiées sur leur source officielle.

## Limites constatées dans le code source

Le moteur `src/lib/devis/reglesFichesCEE.ts` ne comporte qu’un ensemble limité de fiches. Certaines entrées sont explicitement déclarées `verifiee: false` (notamment BAR-TH-172, BAR-TH-143, BAR-TH-125, BAR-TH-112 et BAR-TH-113). La présence d’une catégorie dans le catalogue ne garantit donc pas que ses critères réglementaires sont contrôlés.

Le moteur `src/lib/devis/conformite.ts` ne définit pas de champs de contrôle détaillés pour toutes les fiches et toutes les catégories. Il ne faut pas afficher « conforme » quand une règle n’est pas intégrée : le statut doit rester à contrôler et figurer dans le rapport d’audit.

## Prochaine étape requise pour la correction exhaustive

1. Ouvrir Renova OS avec un compte administrateur/manager et laisser le catalogue charger les données Supabase.
2. Cliquer sur **Exporter l’audit CSV** dans le panneau « Audit réglementaire du catalogue ».
3. Utiliser ce rapport réel pour compléter les exigences fiche par fiche, famille par famille, à partir des documents officiels et des fiches fabricants.
4. Appliquer ensuite une migration SQL idempotente contenant les mises à jour vérifiées des descriptions et des caractéristiques, sans modifier `prix_unitaire_ht`, `forfait_pose_ht`, `forfait_evacuation_ht`, les aides ou les règles déjà correctes.

## Validation technique

Le build n’a pas pu être validé dans l’environnement de travail : l’installation des dépendances a été interrompue et `tsc` a échoué sur des définitions de types incomplètes dans `node_modules` (par exemple `@types/react`). Ce résultat n’établit pas que le code est incorrect, mais le build reste à exécuter dans un environnement où `npm ci` termine correctement.
