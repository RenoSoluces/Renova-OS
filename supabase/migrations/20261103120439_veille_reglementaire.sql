-- Veille réglementaire : arrêtés CEE, mises à jour MaPrimeRénov' / MonProjetAnah, avec date d'effet et fiches concernées.
-- Il n'existe pas de source ouverte fiable en temps réel : les entrées sont saisies, puis relues avant publication.
CREATE TABLE IF NOT EXISTS public.veille_reglementaire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL DEFAULT public.current_organisation_id() REFERENCES public.organisations(id),
  titre text NOT NULL,
  resume text,
  dispositifs text[] NOT NULL DEFAULT '{}',          -- cee, mpr, anah, autre
  type_texte text NOT NULL DEFAULT 'information' CHECK (type_texte IN ('arrete', 'decret', 'projet', 'information')),
  fiches_concernees text[] NOT NULL DEFAULT '{}',    -- ex. {BAR-TH-159}
  date_publication date,
  date_effet date,
  source_url text,
  source_note text,
  impact text,
  statut text NOT NULL DEFAULT 'a_relire' CHECK (statut IN ('a_relire', 'publie', 'archive')),
  cree_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_veille_statut_date ON public.veille_reglementaire(statut, date_publication DESC);

ALTER TABLE public.veille_reglementaire ENABLE ROW LEVEL SECURITY;
CREATE POLICY veille_select ON public.veille_reglementaire FOR SELECT TO authenticated
  USING (public.is_super_admin() OR (organisation_id = public.current_organisation_id()
    AND (statut <> 'a_relire' OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin')))));
CREATE POLICY veille_write ON public.veille_reglementaire FOR ALL TO authenticated
  USING (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))))
  WITH CHECK (public.is_super_admin() OR (organisation_id = public.current_organisation_id() AND EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = (SELECT auth.uid()) AND me.role IN ('admin', 'manager', 'partner_admin', 'company_admin'))));

-- Premières entrées, relevées dans la veille d'un outil tiers : à relire et à confirmer sur Légifrance avant publication.
INSERT INTO public.veille_reglementaire (organisation_id, titre, dispositifs, type_texte, fiches_concernees, date_publication, source_note, statut)
SELECT o.id, v.titre, v.dispositifs, v.type_texte, v.fiches, v.dt::date, 'Relevé dans la veille Qhare le 03/11/2026 — date d''effet et contenu à confirmer sur Légifrance.', 'a_relire'
FROM public.organisations o,
 (VALUES
  ('Projet d''arrêté supprimant la fiche d''opération standardisée BAR-TH-159 « Pompe à chaleur hybride individuelle » du dispositif des CEE', ARRAY['cee'], 'projet', ARRAY['BAR-TH-159'], '2026-10-27'),
  ('Décret n° 2026-935 du 7 octobre 2026 relatif à la suspension des labels et signes de qualité délivrés à une entreprise effectuant des travaux d''économies d''énergie ou de production d''énergie renouvelable', ARRAY['cee','mpr'], 'decret', ARRAY[]::text[], '2026-10-09'),
  ('Projet d''arrêté modifiant la définition de la précarité énergétique dans le cadre des CEE et adaptant les bonifications des secteurs résidentiel et du transport', ARRAY['cee'], 'projet', ARRAY[]::text[], '2026-09-30'),
  ('Arrêté du 18 septembre 2026 abrogeant les fiches d''opérations standardisées TRA-SE-104 et AGRI-EQ-110', ARRAY['cee'], 'arrete', ARRAY['TRA-SE-104','AGRI-EQ-110'], '2026-09-23'),
  ('Décret n° 2026-863 du 12 septembre 2026 relatif aux exigences de performance environnementale concernant l''installation d''un équipement de chauffage, de refroidissement ou de production d''eau chaude sanitaire dans un bâtiment', ARRAY['autre'], 'decret', ARRAY[]::text[], '2026-09-13')
 ) AS v(titre, dispositifs, type_texte, fiches, dt)
WHERE o.id = '86a55ff0-1451-41c9-abaa-b8f82cf53af8'
  AND NOT EXISTS (SELECT 1 FROM public.veille_reglementaire x WHERE x.organisation_id = o.id AND x.titre = v.titre);

NOTIFY pgrst, 'reload schema';
