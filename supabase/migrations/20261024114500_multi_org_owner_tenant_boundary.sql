-- Enforce the tenant boundary even if a profile is reassigned later.
-- A user must not retain access to a prospect owned by another organisation
-- solely because commercial_id or manager_id points to that user.
CREATE OR REPLACE FUNCTION public.can_manage_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles me
      JOIN public.profiles target ON target.id = target_profile_id
      WHERE me.id = (SELECT auth.uid())
        AND me.id <> target.id
        AND (
          (me.role IN ('partner_admin', 'company_admin')
            AND target.organisation_id = me.organisation_id)
          OR (target.manager_id = me.id
            AND target.organisation_id = me.organisation_id)
        )
    );
$function$;
REVOKE ALL ON FUNCTION public.can_manage_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prospect_visible(p_prospect_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.prospects p
      LEFT JOIN public.profiles owner_profile ON owner_profile.id = p.commercial_id
      WHERE p.id = p_prospect_id
        AND (
          (p.commercial_id = (SELECT auth.uid())
            AND p.organisation_id = public.current_organisation_id())
          OR (owner_profile.manager_id = (SELECT auth.uid())
            AND p.organisation_id = public.current_organisation_id())
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
