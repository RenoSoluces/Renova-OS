-- montant_total = CA du chantier chez le partenaire (TTC). Les dossiers importés y avaient recopié nos factures (HT) : on les vide.
-- Les anciennes valeurs sont conservées dans dossiers_montant_total_sauvegarde_20261102.
CREATE TABLE IF NOT EXISTS dossiers_montant_total_sauvegarde_20261102 AS
SELECT d.id AS dossier_id, d.montant_total, now() AS sauvegarde_le FROM dossiers d
WHERE d.devis_id IS NULL AND d.montant_total IS NOT NULL;
ALTER TABLE dossiers_montant_total_sauvegarde_20261102 ENABLE ROW LEVEL SECURITY;

ALTER TABLE dossiers DISABLE TRIGGER dossiers_notify_direct_manager;
ALTER TABLE dossiers DISABLE TRIGGER trg_notify_commercial_dossier_status;
UPDATE dossiers d SET montant_total = NULL
WHERE d.devis_id IS NULL
  AND (coalesce(d.montant_total, 0) = 0
       OR abs(d.montant_total - coalesce((SELECT sum(f.montant_ht) FROM dossier_facturation f WHERE f.dossier_id = d.id AND f.statut <> 'annulee'), 0)) < 0.02);
ALTER TABLE dossiers ENABLE TRIGGER dossiers_notify_direct_manager;
ALTER TABLE dossiers ENABLE TRIGGER trg_notify_commercial_dossier_status;
