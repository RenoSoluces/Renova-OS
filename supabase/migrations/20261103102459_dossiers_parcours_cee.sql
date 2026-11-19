-- Parcours CEE : étape courante et statut propre à l'étape (validés côté application, voir src/lib/dossiers/parcoursCee.ts).
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS parcours_etape text;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS parcours_statut text;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS parcours_maj_le timestamptz;
CREATE INDEX IF NOT EXISTS idx_dossiers_parcours_etape ON dossiers(parcours_etape);
