# Correctifs Renova OS — 15 octobre 2026

## Modifications du code

- Dossiers CEE : la session commerciale ne récupère plus le champ `montant_societe` dans la requête des commissions. L'affichage de la commission société reste réservé aux rôles administrateur et manager ; la commission commerciale reste visible.
- Création et modification d'un prospect : la sélection des produits est désormais chargée depuis `catalogue_produits` (produits actifs) plutôt que dépendre uniquement de la liste de fiches CEE codée en dur. Les produits sélectionnés sont enregistrés dans `prospects.produits_interesses`.
- E-mail de notification : l'URL du logo Reno Soluces a été corrigée vers le domaine public du site.

## Migration Supabase à appliquer

`supabase/migrations/20261015100000_prospects_produits_interesses.sql`

Elle ajoute `produits_interesses` à `public.prospects`. Appliquer cette migration uniquement au projet Supabase réellement utilisé par Renova OS, après vérification du projet sélectionné. Ne pas déployer une migration sur un projet choisi par erreur.

## Vérifications

- `tsc -b` passe dans l'environnement de préparation.
- Le build Vite complet n'a pas pu être exécuté dans cet environnement Linux : le ZIP initial ne contient pas le module optionnel Rollup `@rollup/rollup-linux-x64-gnu` requis par cette plateforme. Sur le poste Windows du projet, lancer `npm install`, puis `npm run build`.
- Le changement d'URL du logo est inclus dans le code de la fonction Edge `notify-new-prospect` ; redéployer cette fonction après avoir vérifié que l'image est accessible à l'URL indiquée.
