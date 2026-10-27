-- Liste d'appels : accès restreint de la personne qui appelle.
-- prospect_visible retrouve sa définition d'origine (devis, dossiers, documents… restent
-- réservés au commercial et à sa hiérarchie). La personne chargée des appels voit la fiche
-- (prospect_row_visible), l'historique des échanges et les rappels, et peut en ajouter.
create or replace function public.prospect_visible(p_prospect_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
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
$$;

create or replace function public.prospect_en_liste_appels(p_prospect_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.prospects p
                  where p.id = p_prospect_id
                    and p.liste_appels_pour = (select auth.uid())
                    and p.organisation_id = public.current_organisation_id());
$$;
revoke all on function public.prospect_en_liste_appels(uuid) from public, anon;
grant execute on function public.prospect_en_liste_appels(uuid) to authenticated;

alter policy interactions_select_scope on public.interactions using (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id));
alter policy interactions_insert_scope on public.interactions with check (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id));
alter policy tasks_select_scope on public.tasks using (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id));
alter policy tasks_insert_scope on public.tasks with check (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id));
alter policy tasks_update_scope on public.tasks
  using (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id))
  with check (public.prospect_visible(prospect_id) or public.prospect_en_liste_appels(prospect_id));
