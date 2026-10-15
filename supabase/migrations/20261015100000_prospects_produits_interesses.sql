-- Mémorise les produits du catalogue choisis lors de la création/modification d'un prospect.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS produits_interesses text[] NOT NULL DEFAULT '{}'::text[];
