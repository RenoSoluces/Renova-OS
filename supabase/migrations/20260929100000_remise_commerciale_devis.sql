-- Remise commerciale négociée sur un devis.
-- La remise est appliquée sur le HT avant calcul de la TVA.
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS remise_type text NOT NULL DEFAULT 'montant',
  ADD COLUMN IF NOT EXISTS remise_valeur numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_ht_avant_remise numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_montant_ht numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE devis
  DROP CONSTRAINT IF EXISTS devis_remise_type_check;
ALTER TABLE devis
  ADD CONSTRAINT devis_remise_type_check CHECK (remise_type IN ('montant', 'pourcentage'));

UPDATE devis
SET montant_ht_avant_remise = COALESCE(montant_ht, 0),
    remise_montant_ht = 0
WHERE montant_ht_avant_remise = 0;
