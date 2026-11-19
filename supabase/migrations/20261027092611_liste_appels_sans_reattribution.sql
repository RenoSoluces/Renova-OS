-- Liste d'appels, version 2 : envoyer un prospect en prospection téléphonique ne change
-- plus son commercial. On note seulement qui doit l'appeler (liste_appels_pour) ; cette
-- personne voit alors le prospect et peut tracer ses appels et rappels.
alter table public.prospects add column if not exists liste_appels_pour uuid references public.profiles(id) on delete set null;
create index if not exists prospects_liste_appels_pour_idx on public.prospects (liste_appels_pour) where liste_appels_pour is not null;

-- Visibilité : la personne chargée des appels voit les prospects de sa liste.
create or replace function public.prospect_row_visible(p_id uuid, p_commercial_id uuid, p_organisation_id uuid, p_pot_commun boolean)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.is_super_admin()
    or (
      p_organisation_id = public.current_organisation_id()
      and (
        p_commercial_id = (select auth.uid())
        or exists (select 1 from public.profiles owner_profile
                   where owner_profile.id = p_commercial_id and owner_profile.manager_id = (select auth.uid()))
        or exists (select 1 from public.profiles me
                   where me.id = (select auth.uid()) and me.role in ('partner_admin', 'company_admin'))
        or exists (select 1 from public.prospects l
                   where l.id = p_id and l.liste_appels_pour = (select auth.uid()))
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
          OR (p.liste_appels_pour = (SELECT auth.uid())
            AND p.organisation_id = public.current_organisation_id())
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

-- Ajout à la liste d'appels de p_appelant, sans toucher au commercial du prospect.
create or replace function public.ajouter_liste_appels(p_ids uuid[], p_assigne uuid)
returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  moi public.profiles;
  cible public.profiles;
  n integer;
begin
  select * into moi from public.profiles where id = (select auth.uid());
  if moi.id is null or not (public.is_super_admin() or moi.role in ('manager', 'commercial_manager', 'partner_admin', 'company_admin')) then
    raise exception 'Seuls les administrateurs et les managers peuvent constituer une liste d''appels.';
  end if;
  select * into cible from public.profiles where id = p_assigne;
  if cible.id is null then raise exception 'Personne introuvable.'; end if;
  if not public.is_super_admin() and cible.organisation_id is distinct from moi.organisation_id then
    raise exception 'Cette personne ne fait pas partie de votre entreprise.';
  end if;

  update public.prospects p
     set liste_appels_le = now(), liste_appels_par = moi.id, liste_appels_pour = cible.id
   where p.id = any(p_ids)
     and p.organisation_id = cible.organisation_id
     and public.prospect_visible(p.id);
  get diagnostics n = row_count;

  if n > 0 and cible.id <> moi.id then
    insert into public.notifications (type, titre, message, recipient_id, lue, meta)
    values ('liste_appels', 'Nouveaux prospects à appeler',
            n || case when n > 1 then ' prospects ont été ajoutés' else ' prospect a été ajouté' end || ' à votre liste d''appels.',
            cible.id, false, jsonb_build_object('source', 'liste_appels', 'nombre', n));
  end if;
  return n;
end;
$$;

-- Retrait de la liste d'appels (la fiche et son commercial ne changent pas).
create or replace function public.retirer_liste_appels(p_id uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  update public.prospects p
     set liste_appels_le = null, liste_appels_par = null, liste_appels_pour = null
   where p.id = p_id
     and (p.liste_appels_pour = (select auth.uid()) or p.liste_appels_par = (select auth.uid())
          or public.is_super_admin()
          or (public.prospect_visible(p.id) and exists (select 1 from public.profiles me where me.id = (select auth.uid())
               and me.role in ('manager', 'commercial_manager', 'partner_admin', 'company_admin'))));
end;
$$;
revoke all on function public.retirer_liste_appels(uuid) from public, anon;
grant execute on function public.retirer_liste_appels(uuid) to authenticated;
