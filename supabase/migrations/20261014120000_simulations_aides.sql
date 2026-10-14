-- Historique des simulations indicatives d'aides par prospect, distinct des résultats 3CL calculés en visite technique.
CREATE TABLE IF NOT EXISTS public.simulations_aides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  produit_id uuid REFERENCES public.catalogue_produits(id) ON DELETE SET NULL,
  geste_id text NOT NULL,
  montant_travaux_ht numeric(12,2) NOT NULL DEFAULT 0,
  quantite numeric(12,2) NOT NULL DEFAULT 1,
  profil_mpr text,
  montant_mpr numeric(12,2) NOT NULL DEFAULT 0,
  montant_cee numeric(12,2) NOT NULL DEFAULT 0,
  taux_cee numeric(10,2) NOT NULL DEFAULT 0,
  avertissement text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulations_aides_prospect ON public.simulations_aides(prospect_id, created_at DESC);
ALTER TABLE public.simulations_aides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS simulations_aides_select_scope ON public.simulations_aides;
CREATE POLICY simulations_aides_select_scope ON public.simulations_aides FOR SELECT TO authenticated USING (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=simulations_aides.prospect_id AND p.commercial_id=auth.uid())
);
DROP POLICY IF EXISTS simulations_aides_write_scope ON public.simulations_aides;
CREATE POLICY simulations_aides_write_scope ON public.simulations_aides FOR ALL TO authenticated USING (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=simulations_aides.prospect_id AND p.commercial_id=auth.uid())
) WITH CHECK (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=simulations_aides.prospect_id AND p.commercial_id=auth.uid())
);
