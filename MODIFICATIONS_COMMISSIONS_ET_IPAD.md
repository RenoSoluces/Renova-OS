# Correctifs Renova OS — 14 octobre 2026

## Modifications incluses

- Calcul des commissions de devis à partir de toutes les lignes produit et de leurs quantités.
- Barème générique appliqué une seule fois par devis.
- Pourcentage commercial appliqué une seule fois sur la base du devis.
- Bouton « Modifier les montants » dans Commissions, visible pour administrateur/manager.
- Correction manuelle séparée du montant commercial et du montant Reno Soluces, avec motif obligatoire.
- Ajustement des échéances non payées ; les échéances déjà payées ne sont pas modifiées.
- Journal des corrections dans `commission_ajustements`.
- Compatibilité renforcée avec Safari/iPadOS et message de secours si le JavaScript ne démarre pas.
- Cible de compilation Safari 13 et nettoyage des anciens caches du service worker.

## Déploiement conseillé

1. Extraire le ZIP par-dessus une copie de travail du projet. Le ZIP n'inclut volontairement ni `.git`, ni `node_modules`, ni `dist`, ni `.env`.
2. Vérifier les variables d'environnement locales et conserver le fichier `.env` existant.
3. Vérifier **le projet Supabase cible** avant toute application de migration. La migration à appliquer est :
   `supabase/migrations/20261014210000_commissions_quantite_ajustement_securise.sql`
4. Appliquer la migration sur le bon projet Supabase, puis déployer le front-end.
5. Sur l'iPad, ouvrir d'abord l'application dans Safari. Si l'ancienne version reste affichée, fermer complètement l'onglet ou l'application installée, puis rouvrir le site. En dernier recours, effacer les données du site dans les réglages Safari et se reconnecter.

## Vérifications

- La vérification TypeScript (`tsc -b`) passe sur les fichiers corrigés.
- Le build Vite complet n'a pas pu être exécuté dans l'environnement de préparation car le ZIP d'origine contient des dépendances installées pour Windows et le binaire Rollup Linux est absent. Sur la machine de développement Windows, exécuter `npm install` puis `npm run build`.
- La migration n'a pas été appliquée à Supabase depuis cette préparation ; elle est livrée dans le ZIP pour application explicite au projet confirmé.
