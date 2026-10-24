-- Harden multi-organisation RLS against legacy permissive policies.
-- Idempotent: safe after the initial multi-organisation foundation migration.

CREATE TABLE IF NOT EXISTS public.prospect_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (prospect_id, organisation_id)
);
CREATE INDEX IF NOT EXISTS prospect_shares_organisation_id_idx
  ON public.prospect_shares (organisation_id);
ALTER TABLE public.prospect_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prospect_visible(p_prospect_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.prospects p
      LEFT JOIN public.profiles owner_profile ON owner_profile.id = p.commercial_id
      WHERE p.id = p_prospect_id
        AND (
          p.commercial_id = (SELECT auth.uid())
          OR owner_profile.manager_id = (SELECT auth.uid())
          OR (
            p.organisation_id = public.current_organisation_id()
            AND EXISTS (
              SELECT 1 FROM public.profiles me
              WHERE me.id = (SELECT auth.uid())
                AND me.role IN ('partner_admin', 'company_admin')
            )
          )
          OR (
            p.commercial_id IS NULL
            AND COALESCE(p.pot_commun, false) = true
            AND EXISTS (
              SELECT 1 FROM public.organisations o
              WHERE o.id = public.current_organisation_id() AND o.type = 'interne'
            )
          )
          OR EXISTS (
            SELECT 1 FROM public.prospect_shares s
            WHERE s.prospect_id = p.id
              AND s.organisation_id = public.current_organisation_id()
          )
        )
    );
$function$;
REVOKE ALL ON FUNCTION public.prospect_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospect_visible(uuid) TO authenticated;

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organisations_select_scoped ON public.organisations;
DROP POLICY IF EXISTS organisations_select_scope ON public.organisations;
CREATE POLICY organisations_select_scope ON public.organisations
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR id = public.current_organisation_id()
  OR EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE (d.facturation_organisation_id = organisations.id
      OR d.destinataire_organisation_id = organisations.id)
      AND public.prospect_visible(d.prospect_id)
  )
);
DROP POLICY IF EXISTS organisations_admin_write ON public.organisations;
CREATE POLICY organisations_admin_write ON public.organisations
FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS prospect_shares_select_scope ON public.prospect_shares;
CREATE POLICY prospect_shares_select_scope ON public.prospect_shares
FOR SELECT TO authenticated
USING (public.is_super_admin() OR organisation_id = public.current_organisation_id());
DROP POLICY IF EXISTS prospect_shares_admin_insert ON public.prospect_shares;
CREATE POLICY prospect_shares_admin_insert ON public.prospect_shares
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() AND shared_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS prospect_shares_admin_delete ON public.prospect_shares;
CREATE POLICY prospect_shares_admin_delete ON public.prospect_shares
FOR DELETE TO authenticated
USING (public.is_super_admin());

-- Remove older broad policies: permissive policies are OR-combined by PostgreSQL.
DROP POLICY IF EXISTS prospects_select_policy ON public.prospects;
DROP POLICY IF EXISTS prospects_select_scope ON public.prospects;
DROP POLICY IF EXISTS prospects_manager_team_select ON public.prospects;
DROP POLICY IF EXISTS prospects_insert_policy ON public.prospects;
DROP POLICY IF EXISTS prospects_insert_scope ON public.prospects;
DROP POLICY IF EXISTS prospects_update_policy ON public.prospects;
DROP POLICY IF EXISTS prospects_update_scope ON public.prospects;
DROP POLICY IF EXISTS prospects_delete_scope ON public.prospects;
CREATE POLICY prospects_select_scope ON public.prospects
FOR SELECT TO authenticated USING (public.prospect_visible(id));
CREATE POLICY prospects_insert_scope ON public.prospects
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (commercial_id = (SELECT auth.uid()) AND prospects.organisation_id = public.current_organisation_id())
  OR EXISTS (
    SELECT 1 FROM public.profiles me
    JOIN public.profiles assigned ON assigned.id = prospects.commercial_id
    WHERE me.id = (SELECT auth.uid())
      AND me.role IN ('partner_admin', 'company_admin')
      AND assigned.organisation_id = me.organisation_id
      AND prospects.organisation_id = me.organisation_id
  )
);
CREATE POLICY prospects_update_scope ON public.prospects
FOR UPDATE TO authenticated
USING (public.prospect_visible(id))
WITH CHECK (
  public.is_super_admin()
  OR (commercial_id = (SELECT auth.uid()) AND prospects.organisation_id = public.current_organisation_id())
  OR EXISTS (
    SELECT 1 FROM public.profiles assigned
    WHERE assigned.id = prospects.commercial_id AND assigned.manager_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = (SELECT auth.uid())
      AND me.role IN ('manager', 'partner_admin', 'company_admin')
      AND me.organisation_id = prospects.organisation_id
  )
  OR EXISTS (
    SELECT 1 FROM public.prospect_shares s
    WHERE s.prospect_id = prospects.id
      AND s.organisation_id = public.current_organisation_id()
  )
);
CREATE POLICY prospects_delete_scope ON public.prospects
FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS dossiers_select_policy ON public.dossiers;
DROP POLICY IF EXISTS dossiers_select_scope ON public.dossiers;
DROP POLICY IF EXISTS dossiers_manager_team_select ON public.dossiers;
DROP POLICY IF EXISTS dossiers_insert_scope ON public.dossiers;
DROP POLICY IF EXISTS dossiers_update_scope ON public.dossiers;
DROP POLICY IF EXISTS dossiers_delete_scope ON public.dossiers;
CREATE POLICY dossiers_select_scope ON public.dossiers
FOR SELECT TO authenticated USING (public.prospect_visible(prospect_id));
CREATE POLICY dossiers_insert_scope ON public.dossiers
FOR INSERT TO authenticated WITH CHECK (public.prospect_visible(prospect_id));
CREATE POLICY dossiers_update_scope ON public.dossiers
FOR UPDATE TO authenticated
USING (public.prospect_visible(prospect_id))
WITH CHECK (public.prospect_visible(prospect_id));
CREATE POLICY dossiers_delete_scope ON public.dossiers
FOR DELETE TO authenticated USING (public.is_super_admin());
