-- Multi-organisation CRM foundation: tenant isolation and explicit prospect sharing.
-- Existing profiles and prospects are preserved; no business data is deleted.

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  type text not null default 'partenaire'
    check (type in ('interne', 'partenaire')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists organisation_id uuid references public.organisations(id),
  add column if not exists manager_id uuid references public.profiles(id);

insert into public.organisations (nom, type)
values ('Reno Soluces', 'interne')
on conflict (nom) do nothing;

update public.profiles
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where organisation_id is null;

-- Preserve the two existing reporting lines.
update public.profiles p
set manager_id = m.id
from public.profiles m
where lower(p.nom_complet) like '%william%'
  and lower(m.nom_complet) like '%mickael%'
  and p.organisation_id = m.organisation_id
  and p.id <> m.id;

update public.profiles p
set manager_id = m.id
from public.profiles m
where lower(p.nom_complet) like '%maxime%'
  and lower(m.nom_complet) like '%melissa%'
  and p.organisation_id = m.organisation_id
  and p.id <> m.id;

create index if not exists profiles_organisation_id_idx
  on public.profiles (organisation_id);
create index if not exists profiles_manager_id_idx
  on public.profiles (manager_id);

create table if not exists public.prospect_shares (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  note text,
  unique (prospect_id, organisation_id)
);
create index if not exists prospect_shares_organisation_id_idx
  on public.prospect_shares (organisation_id);
alter table public.prospect_shares enable row level security;
alter table public.organisations enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.current_organisation_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select p.organisation_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.profiles me
      join public.profiles target on target.id = target_profile_id
      where me.id = auth.uid()
        and (
          (me.role = 'partner_admin' and target.organisation_id = me.organisation_id)
          or (me.role in ('manager', 'commercial_manager') and target.manager_id = me.id)
        )
    );
$$;

create or replace function public.prospect_visible(p_prospect_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $
  select public.is_super_admin()
    or exists (
      select 1
      from public.prospects p
      left join public.profiles owner_profile on owner_profile.id = p.commercial_id
      where p.id = p_prospect_id
        and (
          p.commercial_id = auth.uid()
          or (
            owner_profile.manager_id = auth.uid()
          )
          or (
            p.commercial_id is null
            and coalesce(p.pot_commun, false) = true
            and exists (
              select 1 from public.organisations o
              where o.id = public.current_organisation_id()
                and o.type = 'interne'
            )
          )
          or exists (
            select 1 from public.prospect_shares s
            where s.prospect_id = p.id
              and s.organisation_id = public.current_organisation_id()
          )
          or (
            exists (
              select 1 from public.profiles me
              where me.id = auth.uid()
                and me.role = 'partner_admin'
                and me.organisation_id = owner_profile.organisation_id
            )
          )
        )
    );
$;

-- RLS policies need these helpers for authenticated sessions, not anonymous callers.
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.current_organisation_id() from public, anon;
revoke all on function public.can_manage_profile(uuid) from public, anon;
revoke all on function public.prospect_visible(uuid) from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.current_organisation_id() to authenticated;
grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.prospect_visible(uuid) to authenticated;

-- An explicit share grants visibility to the receiving organisation; it does not
-- change the prospect's original commercial_id or organisation ownership.
drop policy if exists organisations_select_scope on public.organisations;
create policy organisations_select_scope on public.organisations
for select to authenticated
using (public.is_super_admin() or id = public.current_organisation_id());

drop policy if exists organisations_admin_write on public.organisations;
create policy organisations_admin_write on public.organisations
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists prospect_shares_select_scope on public.prospect_shares;
create policy prospect_shares_select_scope on public.prospect_shares
for select to authenticated
using (
  public.is_super_admin()
  or organisation_id = public.current_organisation_id()
  or public.prospect_visible(prospect_id)
);

drop policy if exists prospect_shares_admin_insert on public.prospect_shares;
create policy prospect_shares_admin_insert on public.prospect_shares
for insert to authenticated
with check (public.is_super_admin() and shared_by = auth.uid());

drop policy if exists prospect_shares_admin_delete on public.prospect_shares;
create policy prospect_shares_admin_delete on public.prospect_shares
for delete to authenticated
using (public.is_super_admin());

-- Replace duplicate/legacy prospect policies: permissive policies are OR-combined
-- in PostgreSQL, so leaving old policies would defeat tenant isolation.
drop policy if exists prospects_select_policy on public.prospects;
drop policy if exists prospects_select_scope on public.prospects;
drop policy if exists prospects_update_policy on public.prospects;
drop policy if exists prospects_update_scope on public.prospects;
drop policy if exists prospects_insert_policy on public.prospects;
drop policy if exists prospects_insert_scope on public.prospects;
drop policy if exists prospects_delete_scope on public.prospects;

create policy prospects_select_scope on public.prospects
for select to authenticated
using (public.prospect_visible(id));

create policy prospects_insert_scope on public.prospects
for insert to authenticated
with check (
  public.is_super_admin()
  or commercial_id = auth.uid()
  or (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'partner_admin'
        and commercial_id in (
          select p.id from public.profiles p where p.organisation_id = me.organisation_id
        )
    )
  )
  or (commercial_id is null and coalesce(pot_commun, false) = true and public.is_super_admin())
);

create policy prospects_update_scope on public.prospects
for update to authenticated
using (public.prospect_visible(id))
with check (
  public.is_super_admin()
  or commercial_id = auth.uid()
  or (
    commercial_id is not null
    and exists (
      select 1 from public.profiles me
      join public.profiles assigned on assigned.id = commercial_id
      where me.id = auth.uid()
        and me.role = 'partner_admin'
        and assigned.organisation_id = me.organisation_id
    )
  )
  or (
    commercial_id is not null
    and exists (
      select 1 from public.profiles assigned
      where assigned.id = commercial_id and assigned.manager_id = auth.uid()
    )
  )
  or (
    commercial_id is null and coalesce(pot_commun, false) = true
    and exists (
      select 1
      from public.profiles me
      join public.organisations o on o.id = me.organisation_id
      where me.id = auth.uid()
        and o.type = 'interne'
        and me.role in ('admin', 'manager', 'commercial_manager', 'commercial')
    )
  )
);

create policy prospects_delete_scope on public.prospects
for delete to authenticated
using (public.is_super_admin());

-- Extend the existing profile directory only to an organisation's owner/manager.
drop policy if exists profiles_select_scoped on public.profiles;
create policy profiles_select_scoped on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'partner_admin'
    )
  )
  or manager_id = auth.uid()
);

comment on table public.organisations is
  'Tenant boundary for Renova OS; Reno Soluces admin can administer all organisations.';
comment on table public.prospect_shares is
  'Explicit prospect access grants; sharing never changes the original commercial assignment.';
