-- Renova-OS : séparation du catalogue en trois familles et préparation de l'envoi des factures.
ALTER TABLE public.catalogue_produits
  ADD COLUMN IF NOT EXISTS catalogue_groupe text NOT NULL DEFAULT 'particulier';

UPDATE public.catalogue_produits
SET catalogue_groupe = CASE
  WHEN public_cible = 'professionnel' OR categorie IN ('professionnel_cee','professionnel_hors_cee','destratificateur','hp_flottante','isolation_toiture_pro') THEN 'professionnel'
  WHEN categorie IN ('vt_complete','vt_produit','vt_diagnostic_3cl') THEN 'visite_technique'
  ELSE 'particulier'
END
WHERE catalogue_groupe IS NULL OR catalogue_groupe = '' OR catalogue_groupe = 'particulier';

ALTER TABLE public.catalogue_produits DROP CONSTRAINT IF EXISTS catalogue_produits_catalogue_groupe_check;
ALTER TABLE public.catalogue_produits ADD CONSTRAINT catalogue_produits_catalogue_groupe_check
  CHECK (catalogue_groupe IN ('particulier','professionnel','visite_technique'));

ALTER TABLE public.catalogue_categories
  ADD COLUMN IF NOT EXISTS catalogue_groupe text;
UPDATE public.catalogue_categories SET catalogue_groupe = public_cible WHERE catalogue_groupe IS NULL OR catalogue_groupe = '';
ALTER TABLE public.catalogue_categories ALTER COLUMN catalogue_groupe SET DEFAULT 'particulier';
ALTER TABLE public.catalogue_categories ALTER COLUMN catalogue_groupe SET NOT NULL;
ALTER TABLE public.catalogue_categories DROP CONSTRAINT IF EXISTS catalogue_categories_catalogue_groupe_check;
ALTER TABLE public.catalogue_categories ADD CONSTRAINT catalogue_categories_catalogue_groupe_check
  CHECK (catalogue_groupe IN ('particulier','professionnel','visite_technique'));

-- La catégorie VT n'est pas une cible de devis : le champ public_cible reste compatible avec les devis historiques.
ALTER TABLE public.dossier_facturation
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS email_envoye_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_erreur text;
