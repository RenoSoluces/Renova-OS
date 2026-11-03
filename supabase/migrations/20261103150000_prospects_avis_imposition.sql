-- Avis d'imposition du foyer (liste : numéro fiscal, référence de l'avis, RFR, date de naissance, nombre de personnes).
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS avis_imposition jsonb NOT NULL DEFAULT '[]'::jsonb;
