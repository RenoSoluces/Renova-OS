-- Multi-organisation CRM foundation.
-- Safe to apply once reviewed: preserves existing records and does not alter production by itself.

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  type text not null default 'partenaire' check (type in ('interne', 'partenaire')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.organisations (nom, type)
values ('Reno Soluces', 'interne')
on conflict (nom) do nothing;

alter table public.profiles
  add column if not exists organisation_id uuid references public.organisations(id),
  add column if not exists manager_id uuid references public.profiles(id);

update public.profiles
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where organisation_id is null;

-- Seed only known reporting lines; avoid assigning a profile to itself.
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

create index if not exists profiles_organisation_id_idx on public.profiles (organisation_id);
create index if not exists profiles_manager_id_idx on public.profiles (manager_id);

-- Store original owner separately from the company that invoices the work.
alter table public.prospects add column if not exists organisation_id uuid references public.organisations(id);
update public.prospects p
set organisation_id = coalesce(pr.organisation_id, (select id from public.organisations where nom = 'Reno Soluces'))
from public.profiles pr
where p.commercial_id = pr.id and p.organisation_id is null;
update public.prospects p
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where p.organisation_id is null;

alter table public.dossiers
  add column if not exists organisation_id uuid references public.organisations(id),
  add column if not exists facturation_organisation_id uuid references public.organisations(id);
update public.dossiers d
set organisation_id = p.organisation_id
from public.prospects p
where d.prospect_id = p.id and d.organisation_id is null;
update public.dossiers d
set facturation_organisation_id = organisation_id
where facturation_organisation_id is null;

alter table public.commissions add column if not exists organisation_id uuid references public.organisations(id);
update public.commissions c
set organisation_id = coalesce(p.organisation_id, (select id from public.organisations where nom = 'Reno Soluces'))
from public.profiles p
where c.commercial_id = p.id and c.organisation_id is null;
update public.commissions c
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where c.organisation_id is null;

alter table public.dossier_facturation add column if not exists organisation_id uuid references public.organisations(id);
update public.dossier_facturation df
set organisation_id = d.facturation_organisation_id
from public.dossiers d
where df.dossier_id = d.id and df.organisation_id is null;
update public.dossier_facturation
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where organisation_id is null;

alter table public.factures_clients
  add column if not exists emetteur_organisation_id uuid references public.organisations(id),
  add column if not exists destinataire_organisation_id uuid references public.organisations(id);
update public.factures_clients fc
set emetteur_organisation_id = p.organisation_id
from public.prospects p
where fc.prospect_id = p.id and fc.emetteur_organisation_id is null;
update public.factures_clients
set emetteur_organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where emetteur_organisation_id is null;

create index if not exists prospects_organisation_id_idx on public.prospects (organisation_id);
create index if not exists dossiers_organisation_id_idx on public.dossiers (organisation_id);
create index if not exists dossiers_facturation_organisation_id_idx on public.dossiers (facturation_organisation_id);
create index if not exists commissions_organisation_id_idx on public.commissions (organisation_id);
create index if not exists dossier_facturation_organisation_id_idx on public.dossier_facturation (organisation_id);
create index if not exists factures_clients_emetteur_organisation_id_idx on public.factures_clients (emetteur_organisation_id);

create table if not exists public.prospect_shares (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  note text,
  unique (prospect_id, organisation_id)
);
create index if not exists prospect_shares_organisation_id_idx on public.prospect_shares (organisation_id);

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$function$;

create or replace function public.current_organisation_id()
returns uuid
language sql stable security definer
set search_path = public
as $function$
  select p.organisation_id from public.profiles p where p.id = (select auth.uid());
$function$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $function$
  select public.is_super_admin()
    or exists (
      select 1
      from public.profiles me
      join public.profiles target on target.id = target_profile_id
      where me.id = (select auth.uid())
        and me.id <> target.id
        and (
          (me.role in ('partner_admin', 'company_admin') and target.organisation_id = me.organisation_id)
          or (me.role in ('manager', 'commercial_manager') and target.manager_id = me.id)
        )
    );
$function$;

create or replace function public.prospect_visible(p_prospect_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $function$
  select public.is_super_admin()
    or exists (
      select 1
      from public.prospects p
      left join public.profiles owner_profile on owner_profile.id = p.commercial_id
      where p.id = p_prospect_id
        and (
          p.commercial_id = (select auth.uid())
          or owner_profile.manager_id = (select auth.uid())
          or (
            p.organisation_id = public.current_organisation_id()
            and exists (
              select 1 from public.profiles me
              where me.id = (select auth.uid())
                and me.role in ('partner_admin', 'company_admin')
            )
          )
          or (
            p.commercial_id is null
            and coalesce(p.pot_commun, false) = true
            and exists (
              select 1 from public.organisations o
              where o.id = public.current_organisation_id() and o.type = 'interne'
            )
          )
          or exists (
            select 1 from public.prospect_shares s
            where s.prospect_id = p.id
              and s.organisation_id = public.current_organisation_id()
          )
        )
    );
$function$;

create or replace function public.dossier_visible(p_dossier_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $function$
  select public.is_super_admin()
    or exists (
      select 1 from public.dossiers d
      where d.id = p_dossier_id and public.prospect_visible(d.prospect_id)
    );
$function$;

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.current_organisation_id() from public, anon;
revoke all on function public.can_manage_profile(uuid) from public, anon;
revoke all on function public.prospect_visible(uuid) from public, anon;
revoke all on function public.dossier_visible(uuid) from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.current_organisation_id() to authenticated;
grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.prospect_visible(uuid) to authenticated;
grant execute on function public.dossier_visible(uuid) to authenticated;

alter table public.organisations enable row level security;
alter table public.prospect_shares enable row level security;

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
with check (public.is_super_admin() and shared_by = (select auth.uid()));

drop policy if exists prospect_shares_admin_delete on public.prospect_shares;
create policy prospect_shares_admin_delete on public.prospect_shares
for delete to authenticated
using (public.is_super_admin());

-- Important: PostgreSQL combines permissive policies with OR; remove old broad policies.
drop policy if exists prospects_select_policy on public.prospects;
drop policy if exists prospects_select_scope on public.prospects;
drop policy if exists prospects_update_policy on public.prospects;
drop policy if exists prospects_update_scope on public.prospects;
drop policy if exists prospects_insert_policy on public.prospects;
drop policy if exists prospects_insert_scope on public.prospects;
drop policy if exists prospects_delete_scope on public.prospects;

create policy prospects_select_scope on public.prospects
for select to authenticated using (public.prospect_visible(id));

create policy prospects_insert_scope on public.prospects
for insert to authenticated
with check (
  public.is_super_admin()
  or (commercial_id = (select auth.uid()) and organisation_id = public.current_organisation_id())
  or (
    commercial_id is not null
    and exists (
      select 1 from public.profiles me
      join public.profiles assigned on assigned.id = commercial_id
      where me.id = (select auth.uid())
        and me.role in ('partner_admin', 'company_admin')
        and assigned.organisation_id = me.organisation_id
        and organisation_id = me.organisation_id
    )
  )
);

create policy prospects_update_scope on public.prospects
for update to authenticated
using (public.prospect_visible(id))
with check (
  public.is_super_admin()
  or (commercial_id = (select auth.uid()) and organisation_id = public.current_organisation_id())
  or exists (
    select 1 from public.profiles assigned
    where assigned.id = commercial_id and assigned.manager_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('partner_admin', 'company_admin')
      and me.organisation_id = organisation_id
  )
);

create policy prospects_delete_scope on public.prospects
for delete to authenticated using (public.is_super_admin());

-- Drop the old broad dossier SELECT policy that previously bypassed prospect scoping.
drop policy if exists dossiers_select_policy on public.dossiers;
drop policy if exists dossiers_select_scope on public.dossiers;
drop policy if exists dossiers_insert_scope on public.dossiers;
drop policy if exists dossiers_update_scope on public.dossiers;
drop policy if exists dossiers_delete_scope on public.dossiers;

create policy dossiers_select_scope on public.dossiers
for select to authenticated using (public.prospect_visible(prospect_id));
create policy dossiers_insert_scope on public.dossiers
for insert to authenticated with check (public.prospect_visible(prospect_id));
create policy dossiers_update_scope on public.dossiers
for update to authenticated
using (public.prospect_visible(prospect_id))
with check (public.prospect_visible(prospect_id));
create policy dossiers_delete_scope on public.dossiers
for delete to authenticated using (public.is_super_admin());

-- Company-scoped commissions. Commercials can see their own amounts; company totals stay with management.
drop policy if exists commissions_select_scope on public.commissions;
drop policy if exists commissions_insert_admin on public.commissions;
drop policy if exists commissions_update_admin on public.commissions;
drop policy if exists commissions_delete_admin on public.commissions;

create policy commissions_select_scope on public.commissions
for select to authenticated
using (
  public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and (
      commercial_id = (select auth.uid())
      or public.can_manage_profile(commercial_id)
      or exists (
        select 1 from public.profiles me
        where me.id = (select auth.uid())
          and me.role in ('manager', 'partner_admin', 'company_admin')
          and me.organisation_id = commissions.organisation_id
      )
    )
  )
);
create policy commissions_insert_admin on public.commissions
for insert to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = commissions.organisation_id
  )
);
create policy commissions_update_admin on public.commissions
for update to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = commissions.organisation_id
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = commissions.organisation_id
  )
);
create policy commissions_delete_admin on public.commissions
for delete to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = commissions.organisation_id
  )
);


-- Legal/banking details are stored per company, not in a globally readable singleton.
alter table public.entreprises add column if not exists organisation_id uuid references public.organisations(id);
update public.entreprises
set organisation_id = (select id from public.organisations where nom = 'Reno Soluces')
where organisation_id is null;
create index if not exists entreprises_organisation_id_idx on public.entreprises (organisation_id);

drop policy if exists entreprises_select_authenticated on public.entreprises;
drop policy if exists entreprises_admin_write on public.entreprises;
create policy entreprises_select_scope on public.entreprises
for select to authenticated
using (
  public.is_super_admin()
  or organisation_id = public.current_organisation_id()
);
create policy entreprises_write_scope on public.entreprises
for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = entreprises.organisation_id
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
      and me.organisation_id = entreprises.organisation_id
  )
);

-- Installateur directory: no full directory access for commercial/apporteur roles.
drop policy if exists installateurs_select on public.installateurs;
create policy installateurs_select on public.installateurs
for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid())
      and me.role in ('manager', 'partner_admin', 'company_admin')
  )
);

-- Keep billing rows tied to the dossier's explicitly selected invoicing organisation.
drop policy if exists dossier_facturation_select on public.dossier_facturation;
drop policy if exists dossier_facturation_write on public.dossier_facturation;
create policy dossier_facturation_select_scope on public.dossier_facturation
for select to authenticated using (public.dossier_visible(dossier_id));
create policy dossier_facturation_write_scope on public.dossier_facturation
for all to authenticated
using (public.dossier_visible(dossier_id))
with check (public.dossier_visible(dossier_id));

drop policy if exists factures_clients_select_scope on public.factures_clients;
drop policy if exists factures_clients_write_scope on public.factures_clients;
create policy factures_clients_select_scope on public.factures_clients
for select to authenticated using (public.prospect_visible(prospect_id));
create policy factures_clients_write_scope on public.factures_clients
for all to authenticated
using (public.prospect_visible(prospect_id))
with check (public.prospect_visible(prospect_id));


-- Populate tenant dimensions server-side so existing UI writes remain compatible.
create or replace function public.set_multi_org_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor_org uuid;
begin
  select p.organisation_id into actor_org
  from public.profiles p
  where p.id = (select auth.uid());

  -- Authenticated clients cannot transfer original ownership or write another
  -- company's financial rows. Trusted service-role operations remain possible.
  if (select auth.uid()) is not null and not public.is_super_admin() then
    if tg_table_name = 'prospects' and tg_op = 'UPDATE'
      and new.organisation_id is distinct from old.organisation_id then
      raise exception 'Le partage ne transfère pas la propriété du prospect.';
    end if;
    if tg_table_name = 'prospects' and new.organisation_id is not null
      and new.organisation_id <> actor_org then
      raise exception 'Un prospect doit appartenir à votre entreprise.';
    end if;
    if tg_table_name = 'dossiers' then
      if new.organisation_id is not null and new.organisation_id is distinct from
        (select p.organisation_id from public.prospects p where p.id = new.prospect_id) then
        raise exception 'L’entreprise propriétaire du dossier suit celle du prospect.';
      end if;
      if new.facturation_organisation_id is not null
        and new.facturation_organisation_id <> actor_org then
        raise exception 'La facturation doit être portée par votre entreprise.';
      end if;
    end if;
    if tg_table_name = 'commissions' and new.organisation_id is not null
      and new.organisation_id <> actor_org then
      raise exception 'Une commission ne peut être rattachée qu’à votre entreprise.';
    end if;
    if tg_table_name = 'dossier_facturation' and new.organisation_id is not null
      and new.organisation_id <> (
        select d.facturation_organisation_id from public.dossiers d where d.id = new.dossier_id
      ) then
      raise exception 'La facture doit suivre l’entreprise de facturation du dossier.';
    end if;
    if tg_table_name = 'factures_clients' and new.emetteur_organisation_id is not null
      and new.emetteur_organisation_id <> actor_org then
      raise exception 'Vous ne pouvez facturer qu’au nom de votre entreprise.';
    end if;
  end if;

  if tg_table_name = 'prospects' then
    if new.organisation_id is null then
      new.organisation_id := coalesce(
        (select p.organisation_id from public.profiles p where p.id = new.commercial_id),
        actor_org,
        (select id from public.organisations where nom = 'Reno Soluces')
      );
    end if;
  elsif tg_table_name = 'dossiers' then
    if new.organisation_id is null then
      new.organisation_id := (select p.organisation_id from public.prospects p where p.id = new.prospect_id);
    end if;
    if new.facturation_organisation_id is null then
      new.facturation_organisation_id := new.organisation_id;
    end if;
  elsif tg_table_name = 'commissions' then
    if new.organisation_id is null then
      new.organisation_id := coalesce(
        (select p.organisation_id from public.profiles p where p.id = new.commercial_id),
        actor_org,
        (select id from public.organisations where nom = 'Reno Soluces')
      );
    end if;
  elsif tg_table_name = 'dossier_facturation' then
    if new.organisation_id is null then
      new.organisation_id := (
        select d.facturation_organisation_id from public.dossiers d where d.id = new.dossier_id
      );
    end if;
  elsif tg_table_name = 'factures_clients' then
    if new.emetteur_organisation_id is null then
      new.emetteur_organisation_id := coalesce(
        actor_org,
        (select p.organisation_id from public.prospects p where p.id = new.prospect_id)
      );
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists prospects_set_multi_org_defaults on public.prospects;
create trigger prospects_set_multi_org_defaults before insert or update on public.prospects
for each row execute function public.set_multi_org_defaults();
drop trigger if exists dossiers_set_multi_org_defaults on public.dossiers;
create trigger dossiers_set_multi_org_defaults before insert or update on public.dossiers
for each row execute function public.set_multi_org_defaults();
drop trigger if exists commissions_set_multi_org_defaults on public.commissions;
create trigger commissions_set_multi_org_defaults before insert or update on public.commissions
for each row execute function public.set_multi_org_defaults();
drop trigger if exists dossier_facturation_set_multi_org_defaults on public.dossier_facturation;
create trigger dossier_facturation_set_multi_org_defaults before insert or update on public.dossier_facturation
for each row execute function public.set_multi_org_defaults();
drop trigger if exists factures_clients_set_multi_org_defaults on public.factures_clients;
create trigger factures_clients_set_multi_org_defaults before insert or update on public.factures_clients
for each row execute function public.set_multi_org_defaults();

-- Prevent a signed-in user from promoting themselves or moving themselves to another tenant.
create or replace function public.guard_multi_org_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (select auth.uid()) = old.id and not public.is_super_admin() then
    if new.role is distinct from old.role
      or new.organisation_id is distinct from old.organisation_id
      or new.manager_id is distinct from old.manager_id then
      raise exception 'Vous ne pouvez pas modifier votre rôle, votre entreprise ou votre responsable.';
    end if;
  end if;
  if not public.is_super_admin()
    and (new.organisation_id is distinct from old.organisation_id
      or new.manager_id is distinct from old.manager_id)
    and (select auth.uid()) is not null then
    raise exception 'Seul le Grand Admin peut modifier le rattachement organisationnel.';
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_multi_org_profile_fields on public.profiles;
create trigger guard_multi_org_profile_fields before update on public.profiles
for each row execute function public.guard_multi_org_profile_fields();

revoke all on function public.set_multi_org_defaults() from public, anon;
revoke all on function public.guard_multi_org_profile_fields() from public, anon;

-- Rebuild profile visibility after the tenant columns exist; do not leave the previous
-- admin/manager-wide permissive policy OR-combined with this policy.
drop policy if exists profiles_select_scoped on public.profiles;
create policy profiles_select_scoped on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.is_super_admin()
  or manager_id = (select auth.uid())
  or (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role in ('partner_admin', 'company_admin')
    )
  )
);


-- Tenant-scope secondary records too; old permissive policies are OR-combined.
drop policy if exists notifications_select_scope on public.notifications;
drop policy if exists notifications_insert_scope on public.notifications;
drop policy if exists notifications_update_scope on public.notifications;
drop policy if exists notifications_delete_scope on public.notifications;
create policy notifications_select_scope on public.notifications
for select to authenticated
using (
  recipient_id = (select auth.uid())
  or public.is_super_admin()
  or (recipient_id is null and prospect_id is not null and public.prospect_visible(prospect_id))
);
create policy notifications_insert_scope on public.notifications
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    (recipient_id is null or recipient_id = (select auth.uid()))
    and (prospect_id is null or public.prospect_visible(prospect_id))
  )
);
create policy notifications_update_scope on public.notifications
for update to authenticated
using (
  recipient_id = (select auth.uid())
  or public.is_super_admin()
  or (recipient_id is null and prospect_id is not null and public.prospect_visible(prospect_id))
)
with check (
  public.is_super_admin()
  or recipient_id = (select auth.uid())
  or (recipient_id is null and (prospect_id is null or public.prospect_visible(prospect_id)))
);
create policy notifications_delete_scope on public.notifications
for delete to authenticated
using (
  recipient_id = (select auth.uid())
  or public.is_super_admin()
  or (recipient_id is null and prospect_id is not null and public.prospect_visible(prospect_id))
);

drop policy if exists prospect_messages_select on public.prospect_messages;
drop policy if exists prospect_messages_insert on public.prospect_messages;
drop policy if exists prospect_messages_update on public.prospect_messages;
create policy prospect_messages_select_scope on public.prospect_messages
for select to authenticated using (public.prospect_visible(prospect_id));
create policy prospect_messages_insert_scope on public.prospect_messages
for insert to authenticated
with check (sender_id = (select auth.uid()) and public.prospect_visible(prospect_id));
create policy prospect_messages_update_scope on public.prospect_messages
for update to authenticated
using ((recipient_id = (select auth.uid()) or public.is_super_admin()) and public.prospect_visible(prospect_id))
with check (public.prospect_visible(prospect_id) and (recipient_id = (select auth.uid()) or public.is_super_admin()));

drop policy if exists factures_clients_lignes_scope on public.factures_clients_lignes;
create policy factures_clients_lignes_scope on public.factures_clients_lignes
for all to authenticated
using (
  exists (
    select 1 from public.factures_clients fc
    where fc.id = facture_id and public.prospect_visible(fc.prospect_id)
  )
)
with check (
  exists (
    select 1 from public.factures_clients fc
    where fc.id = facture_id and public.prospect_visible(fc.prospect_id)
  )
);

drop policy if exists commission_echeances_select_scope on public.commission_echeances;
drop policy if exists commission_echeances_write_admin on public.commission_echeances;
create policy commission_echeances_select_scope on public.commission_echeances
for select to authenticated
using (
  exists (select 1 from public.commissions c where c.id = commission_id)
);
create policy commission_echeances_write_scope on public.commission_echeances
for all to authenticated
using (
  exists (
    select 1 from public.commissions c
    where c.id = commission_id
      and (
        public.is_super_admin()
        or exists (
          select 1 from public.profiles me
          where me.id = (select auth.uid())
            and me.role in ('manager', 'partner_admin', 'company_admin')
            and me.organisation_id = c.organisation_id
        )
      )
  )
)
with check (
  exists (
    select 1 from public.commissions c
    where c.id = commission_id
      and (
        public.is_super_admin()
        or exists (
          select 1 from public.profiles me
          where me.id = (select auth.uid())
            and me.role in ('manager', 'partner_admin', 'company_admin')
            and me.organisation_id = c.organisation_id
        )
      )
  )
);

drop policy if exists commission_ajustements_select_admin on public.commission_ajustements;
create policy commission_ajustements_select_scope on public.commission_ajustements
for select to authenticated
using (
  exists (
    select 1 from public.commissions c
    where c.id = commission_id
      and (
        public.is_super_admin()
        or c.commercial_id = (select auth.uid())
        or public.can_manage_profile(c.commercial_id)
        or exists (
          select 1 from public.profiles me
          where me.id = (select auth.uid())
            and me.role in ('manager', 'partner_admin', 'company_admin')
            and me.organisation_id = c.organisation_id
        )
      )
  )
);

drop policy if exists simulations_aides_select_scope on public.simulations_aides;
drop policy if exists simulations_aides_write_scope on public.simulations_aides;
create policy simulations_aides_select_scope on public.simulations_aides
for select to authenticated using (public.prospect_visible(prospect_id));
create policy simulations_aides_write_scope on public.simulations_aides
for all to authenticated
using (public.prospect_visible(prospect_id))
with check (public.prospect_visible(prospect_id));

drop policy if exists planning_select_scope on public.planning_events;
drop policy if exists planning_insert_scope on public.planning_events;
drop policy if exists planning_update_scope on public.planning_events;
drop policy if exists planning_delete_scope on public.planning_events;
create policy planning_select_scope on public.planning_events
for select to authenticated
using (
  public.is_super_admin()
  or (prospect_id is not null and public.prospect_visible(prospect_id))
  or (prospect_id is null and user_id = (select auth.uid()))
);
create policy planning_insert_scope on public.planning_events
for insert to authenticated
with check (
  public.is_super_admin()
  or (
    user_id = (select auth.uid())
    and (prospect_id is null or public.prospect_visible(prospect_id))
  )
);
create policy planning_update_scope on public.planning_events
for update to authenticated
using (
  public.is_super_admin()
  or (user_id = (select auth.uid()) and (prospect_id is null or public.prospect_visible(prospect_id)))
)
with check (
  public.is_super_admin()
  or (user_id = (select auth.uid()) and (prospect_id is null or public.prospect_visible(prospect_id)))
);
create policy planning_delete_scope on public.planning_events
for delete to authenticated
using (
  public.is_super_admin()
  or (user_id = (select auth.uid()) and (prospect_id is null or public.prospect_visible(prospect_id)))
);

drop policy if exists devis_delete_admin on public.devis;
create policy devis_delete_scope on public.devis
for delete to authenticated using (public.prospect_visible(prospect_id));
drop policy if exists visites_delete_admin on public.visites;
create policy visites_delete_scope on public.visites
for delete to authenticated using (public.prospect_visible(prospect_id));

drop policy if exists audit_select_admin on public.audit_logs;
create policy audit_select_admin on public.audit_logs
for select to authenticated using (public.is_super_admin());

-- Shared commission schedules and audit adjustments are not a partner-facing directory.
drop policy if exists commission_bareme_select_admin on public.commission_bareme;
create policy commission_bareme_select_admin on public.commission_bareme
for select to authenticated using (public.is_super_admin());

comment on table public.organisations is
  'Tenant boundary for Renova OS; the global admin can administer all organisations.';
comment on table public.prospect_shares is
  'Explicit prospect visibility grants; sharing does not change the original owner organisation.';
comment on column public.dossiers.facturation_organisation_id is
  'Organisation that issues invoices for this dossier; independent from original prospect ownership.';
