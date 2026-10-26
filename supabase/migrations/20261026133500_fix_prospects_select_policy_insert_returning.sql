-- Déjà appliqué sur Supabase le 26/10/2026.
-- La politique SELECT des prospects appelait prospect_visible(id), qui relit la table :
-- lors d'un INSERT ... RETURNING (création depuis l'app), la nouvelle ligne n'est pas encore
-- visible par cette sous-requête, d'où « new row violates row-level security policy ».
create or replace function public.prospect_row_visible(p_id uuid, p_commercial_id uuid, p_organisation_id uuid, p_pot_commun boolean)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_super_admin()
    or (
      p_organisation_id = public.current_organisation_id()
      and (
        p_commercial_id = (select auth.uid())
        or exists (select 1 from public.profiles owner_profile
                   where owner_profile.id = p_commercial_id and owner_profile.manager_id = (select auth.uid()))
        or exists (select 1 from public.profiles me
                   where me.id = (select auth.uid()) and me.role in ('partner_admin', 'company_admin'))
      )
    )
    or (
      p_commercial_id is null and coalesce(p_pot_commun, false)
      and exists (select 1 from public.organisations o
                  where o.id = public.current_organisation_id() and o.type = 'interne')
    )
    or exists (select 1 from public.prospect_shares s
               where s.prospect_id = p_id and s.organisation_id = public.current_organisation_id());
$$;

revoke all on function public.prospect_row_visible(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.prospect_row_visible(uuid, uuid, uuid, boolean) to authenticated;

alter policy prospects_select_scope on public.prospects
  using (public.prospect_row_visible(id, commercial_id, organisation_id, pot_commun));
