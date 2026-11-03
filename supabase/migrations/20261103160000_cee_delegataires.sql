-- CEE par délégataire : le montant d'une prime CEE dépend du délégataire / de l'obligé qui rachète les certificats.
-- Une grille de prix (€/MWh cumac) est tenue par délégataire, éventuellement par fiche d'opération standardisée,
-- par niveau de précarité et par période de validité. Aucun prix n'est fourni par défaut : ils viennent des contrats.
CREATE TABLE IF NOT EXISTS public.cee_delegataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL DEFAULT public.current_organisation_id() REFERENCES public.organisations(id),
  nom text NOT NULL,
  type text NOT NULL DEFAULT 'delegataire' CHECK (type IN ('obligé', 'delegataire', 'eligible')),
  contact text,
  email text,
  notes text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cee_grille_prix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL DEFAULT public.current_organisation_id() REFERENCES public.organisations(id),
  delegataire_id uuid NOT NULL REFERENCES public.cee_delegataires(id) ON DELETE CASCADE,
  fiche_reference text,                       -- ex. BAR-TH-171 ; NULL = toutes les fiches
  precarite text CHECK (precarite IN ('grande_precarite', 'precarite', 'classique')), -- NULL = tous les ménages
  prix_eur_par_mwh_cumac numeric(10,4) NOT NULL CHECK (prix_eur_par_mwh_cumac >= 0),
  bonification_pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (bonification_pct >= 0), -- ex. « coup de pouce »
  date_debut date,
  date_fin date,
  notes text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cee_grille_delegataire ON public.cee_grille_prix(delegataire_id);

ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_delegataire_id uuid REFERENCES public.cee_delegataires(id) ON DELETE SET NULL;
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_fiche_reference text;
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_mwh_cumac numeric(14,3);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_prix_applique numeric(10,4);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_prime_estimee numeric(12,2);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS cee_calcule_le timestamptz;

ALTER TABLE public.cee_delegataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cee_grille_prix ENABLE ROW LEVEL SECURITY;

CREATE POLICY cee_delegataires_select ON public.cee_delegataires FOR SELECT TO authenticated
  USING (public.is_super_admin() OR organisation_id = public.current_organisation_id());
CREATE POLICY cee_delegataires_write ON public.cee_delegataires FOR ALL TO authenticated
  USING (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))))
  WITH CHECK (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))));

CREATE POLICY cee_grille_prix_select ON public.cee_grille_prix FOR SELECT TO authenticated
  USING (public.is_super_admin() OR organisation_id = public.current_organisation_id());
CREATE POLICY cee_grille_prix_write ON public.cee_grille_prix FOR ALL TO authenticated
  USING (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))))
  WITH CHECK (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))));

NOTIFY pgrst, 'reload schema';
