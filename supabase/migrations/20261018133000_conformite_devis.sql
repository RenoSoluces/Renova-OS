-- Métadonnées de conformité saisies lors de la préparation du devis.
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS conformite_devis jsonb NOT NULL DEFAULT '{}'::jsonb;
