create table if not exists public.commission_facture_sequences (
  commercial_id uuid not null references auth.users(id) on delete cascade,
  annee integer not null,
  dernier_numero integer not null default 0 check (dernier_numero >= 0),
  primary key (commercial_id, annee)
);

alter table public.commission_facture_sequences enable row level security;
revoke all on public.commission_facture_sequences from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('commission-factures', 'commission-factures', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

create or replace function public.commission_facture_storage_visible(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  facture_id uuid;
  facture_owner uuid;
  facture_org uuid;
  current_org uuid;
  current_role text;
begin
  if (storage.foldername(object_name))[1] is null
     or (storage.foldername(object_name))[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or (storage.foldername(object_name))[2] is null
     or (storage.foldername(object_name))[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  facture_owner := ((storage.foldername(object_name))[1])::uuid;
  facture_id := ((storage.foldername(object_name))[2])::uuid;
  select p.organisation_id, p.role into current_org, current_role
  from public.profiles p where p.id = auth.uid();
  select f.organisation_id into facture_org
  from public.commission_factures f
  where f.id = facture_id and f.commercial_id = facture_owner;
  if facture_org is null then return false; end if;
  if auth.uid() = facture_owner then return true; end if;
  return current_role in ('admin','manager','super_admin','partner','partner_admin','company_admin')
     and current_org = facture_org;
end;
$$;

drop policy if exists commission_factures_storage_read on storage.objects;
create policy commission_factures_storage_read on storage.objects
for select to authenticated
using (bucket_id = 'commission-factures' and public.commission_facture_storage_visible(name));

drop policy if exists commission_factures_storage_insert on storage.objects;
create policy commission_factures_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'commission-factures'
  and public.commission_facture_storage_visible(name)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'apporteur'
  )
);

drop policy if exists commission_factures_storage_update on storage.objects;
create policy commission_factures_storage_update on storage.objects
for update to authenticated
using (bucket_id = 'commission-factures' and public.commission_facture_storage_visible(name))
with check (bucket_id = 'commission-factures' and public.commission_facture_storage_visible(name));

create or replace function public.attribuer_numero_facture_commission(p_facture_id uuid)
returns table(facture_id uuid, numero_facture text, date_emission date, montant_ht numeric, taux_tva numeric, commission_id uuid, commercial_id uuid, organisation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  f public.commission_factures%rowtype;
  y integer := extract(year from current_date)::integer;
  n integer;
  company public.entreprises%rowtype;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.role = 'apporteur') then
    raise exception 'Réservé aux apporteurs d’affaires';
  end if;
  select * into f from public.commission_factures
    where id = p_facture_id and commercial_id = uid for update;
  if not found then raise exception 'Facture introuvable ou accès refusé'; end if;
  if f.statut not in ('a_preparer','refusee') then raise exception 'Cette facture n’est plus modifiable'; end if;
  if exists (
    select 1 from public.apporteur_facturation a
    where a.user_id = uid
      and (trim(a.raison_sociale) = '' or trim(a.siret) !~ '^\d{14}$'
        or trim(a.adresse) = '' or trim(a.code_postal) = '' or trim(a.ville) = ''
        or trim(a.email_facturation) = '')
  ) then raise exception 'Informations légales de l’apporteur incomplètes'; end if;
  if not exists (select 1 from public.apporteur_facturation a where a.user_id = uid) then
    raise exception 'Renseignez d’abord vos informations de facturation';
  end if;
  select * into company from public.entreprises e
    where e.organisation_id = f.organisation_id
    order by e.created_at desc nulls last limit 1;
  if not found or trim(coalesce(company.raison_sociale,'')) = ''
    or trim(coalesce(company.siret,'')) = '' or trim(coalesce(company.adresse,'')) = ''
    or trim(coalesce(company.code_postal,'')) = '' or trim(coalesce(company.ville,'')) = '' then
    raise exception 'Les informations légales du destinataire Reno Soluces doivent être complétées dans Paramètres';
  end if;
  if f.numero_facture_emise is not null and f.numero_facture_emise <> '' then
    return query select f.id, f.numero_facture_emise, f.date_emission, f.montant_ht, f.taux_tva, f.commission_id, f.commercial_id, f.organisation_id;
    return;
  end if;
  insert into public.commission_facture_sequences(commercial_id, annee, dernier_numero)
    values(uid, y, 0) on conflict (commercial_id, annee) do nothing;
  update public.commission_facture_sequences
    set dernier_numero = dernier_numero + 1
    where commercial_id = uid and annee = y
    returning dernier_numero into n;
  update public.commission_factures
    set numero_facture_emise = 'AP-' || y::text || '-' || lpad(n::text, 5, '0'),
        date_emission = current_date,
        updated_at = now()
    where id = f.id
    returning * into f;
  return query select f.id, f.numero_facture_emise, f.date_emission, f.montant_ht, f.taux_tva, f.commission_id, f.commercial_id, f.organisation_id;
end;
$$;

revoke all on function public.attribuer_numero_facture_commission(uuid) from public, anon;
grant execute on function public.attribuer_numero_facture_commission(uuid) to authenticated;
revoke all on function public.commission_facture_storage_visible(text) from public, anon;
grant execute on function public.commission_facture_storage_visible(text) to authenticated;
