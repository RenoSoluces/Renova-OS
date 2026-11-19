-- Licence logicielle vendue à une entreprise : conditions commerciales, statut, acceptation des conditions.
create table if not exists public.licences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations(id) on delete cascade,
  statut text not null default 'brouillon' check (statut in ('brouillon','essai','active','suspendue','resiliee')),
  nb_licences int not null default 1 check (nb_licences >= 1),
  prix_ht_mensuel numeric(10,2) not null default 39 check (prix_ht_mensuel >= 0),
  engagement_mois int not null default 12 check (engagement_mois >= 0),
  preavis_jours int not null default 30 check (preavis_jours >= 0),
  essai_jours int not null default 0 check (essai_jours >= 0),
  debut date,
  client_raison_sociale text, client_forme text, client_siret text,
  client_adresse text, client_code_postal text, client_ville text,
  signataire_nom text, signataire_fonction text, signataire_email text,
  conditions_version text,
  conditions_envoyees_le timestamptz,
  acceptees_le timestamptz,
  acceptees_par text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.licences enable row level security;

create policy licences_select on public.licences for select
  using (public.is_super_admin() or organisation_id = public.current_organisation_id());
create policy licences_ecriture on public.licences for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Le dirigeant du client accepte les conditions (la trace reste côté serveur, avec l'heure du serveur).
create or replace function public.accepter_conditions_licence(p_nom text)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','partner_admin','company_admin') then
    raise exception 'Seul le dirigeant peut accepter les conditions';
  end if;
  if coalesce(trim(p_nom),'') = '' then raise exception 'Nom du signataire requis'; end if;
  update licences set acceptees_le = now(), acceptees_par = trim(p_nom), updated_at = now()
   where organisation_id = current_organisation_id() and conditions_envoyees_le is not null and acceptees_le is null;
end $$;
revoke all on function public.accepter_conditions_licence(text) from public;
grant execute on function public.accepter_conditions_licence(text) to authenticated;
