-- Lien entre échéance de facturation et devis interne de suivi.
ALTER TABLE dossier_facturation
  ADD COLUMN IF NOT EXISTS devis_id uuid REFERENCES devis(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dossier_facturation_devis_id
  ON dossier_facturation(devis_id) WHERE devis_id IS NOT NULL;

ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS origine_interne boolean NOT NULL DEFAULT false;

-- Les devis internes de facturation sont comptés dans la liste des devis signés,
-- mais ne doivent pas déclencher une commission commerciale de devis de travaux.
DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON devis;
CREATE TRIGGER trg_sync_commission_devis_signe
AFTER INSERT OR UPDATE OF statut ON devis
FOR EACH ROW
WHEN (NEW.origine_interne IS DISTINCT FROM TRUE)
EXECUTE FUNCTION fn_sync_commission_devis_signe();
