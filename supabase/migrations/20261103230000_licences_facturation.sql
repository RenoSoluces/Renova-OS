-- Offres mensuelle / annuelle, facturation des licences et suspension immédiate en cas d'impayé.
alter table public.licences
  add column if not exists formule text not null default 'mensuel' check (formule in ('mensuel','annuel')),
  add column if not exists remise_annuelle_pct numeric(5,2) not null default 15 check (remise_annuelle_pct >= 0 and remise_annuelle_pct < 100),
  add column if not exists mandat_sepa text not null default 'aucun' check (mandat_sepa in ('aucun','en_attente','actif'));

create table if not exists public.licence_factures (
  id uuid primary key default gen_random_uuid(),
  licence_id uuid not null references public.licences(id) on delete cascade,
  numero text not null unique,
  formule text not null check (formule in ('mensuel','annuel')),
  periode_debut date not null,
  periode_fin date not null,
  montant_ht numeric(10,2) not null check (montant_ht >= 0),
  tva_taux numeric(5,2) not null default 20,
  montant_ttc numeric(10,2) not null,
  statut text not null default 'emise' check (statut in ('emise','payee','impayee')),
  emise_le date not null default current_date,
  echeance_le date not null default current_date,
  payee_le date,
  mode_paiement text check (mode_paiement in ('prelevement','virement','autre')),
  created_at timestamptz not null default now()
);
create index if not exists licence_factures_licence_idx on public.licence_factures(licence_id, emise_le desc);
alter table public.licence_factures enable row level security;
create policy licence_factures_select on public.licence_factures for select
  using (public.is_super_admin() or exists (select 1 from public.licences l where l.id = licence_id and l.organisation_id = public.current_organisation_id()));
create policy licence_factures_ecriture on public.licence_factures for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Un impayé suspend la licence immédiatement ; le règlement de la dernière facture impayée la réactive.
create or replace function public.licence_facture_vers_statut()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'impayee' then
    update licences set statut = 'suspendue', updated_at = now() where id = new.licence_id and statut in ('essai','active');
  elsif new.statut = 'payee' then
    if not exists (select 1 from licence_factures f where f.licence_id = new.licence_id and f.statut = 'impayee' and f.id <> new.id) then
      update licences set statut = 'active', updated_at = now() where id = new.licence_id and statut = 'suspendue';
    end if;
  end if;
  return new;
end $$;
create trigger licence_facture_statut after insert or update of statut on public.licence_factures
  for each row execute function public.licence_facture_vers_statut();
