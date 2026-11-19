-- SAV : observation, installateur, créateur et date de clôture.
-- Statuts : ouvert (à traiter), en_cours, rdv_planifie, attente_fournisseur, clos (réglé).
ALTER TABLE sav_interventions ADD COLUMN IF NOT EXISTS observation text DEFAULT '';
ALTER TABLE sav_interventions ADD COLUMN IF NOT EXISTS installateur_id uuid REFERENCES installateurs(id) ON DELETE SET NULL;
ALTER TABLE sav_interventions ADD COLUMN IF NOT EXISTS cree_par uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE sav_interventions ADD COLUMN IF NOT EXISTS date_cloture timestamptz;
CREATE INDEX IF NOT EXISTS idx_sav_interventions_statut ON sav_interventions(statut);
CREATE INDEX IF NOT EXISTS idx_sav_interventions_dossier ON sav_interventions(dossier_id);
UPDATE sav_interventions SET date_cloture = coalesce(date_intervention, created_at) WHERE statut = 'clos' AND date_cloture IS NULL;
