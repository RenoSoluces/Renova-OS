/*
# Retour arrière : suppression du modèle financier par dossier

Après clarification avec le client, le fonctionnement voulu pour les commissions
est celui déjà en place depuis la migration `20260912100000_renova_os_v2_metier.sql` :

- déclencheur : signature d'un devis (`devis.statut = 'signe'`),
- montant : déterminé par la matrice de rémunération que l'admin définit
  dans `commission_bareme` (onglet "Barème" de la page Commissions),
- le trigger `fn_sync_commission_devis_signe` (déjà existant) crée alors la ligne
  dans `commissions` avec `reference_type = 'devis'`.

Le modèle "dossier" ajouté dans `20260922090000_fix_commissions_dossiers.sql`
(saisie manuelle de prix_partenaire / commission_renova / commission_commercial
sur chaque dossier) ne correspond pas à ce fonctionnement et fait doublon avec le
montant du devis. On le retire proprement.
*/

DROP TRIGGER IF EXISTS trg_sync_commission_dossier ON dossiers;
DROP FUNCTION IF EXISTS fn_sync_commission_dossier();

/*
Un second trigger (`trg_prepare_dossier_financier`) existe sur `dossiers` et dépend
lui aussi de `prix_partenaire`. Il n'apparaît dans aucune migration du dépôt : il a
été créé directement en base (SQL Editor) en dehors du suivi de version. On le
supprime également pour pouvoir retirer la colonne.
*/
DROP TRIGGER IF EXISTS trg_prepare_dossier_financier ON dossiers;

DELETE FROM commissions WHERE reference_type = 'dossier';

ALTER TABLE dossiers
  DROP COLUMN IF EXISTS prix_partenaire,
  DROP COLUMN IF EXISTS commission_renova,
  DROP COLUMN IF EXISTS commission_commercial;
