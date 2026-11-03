-- Suivi de l'avancement des dossiers d'aide de l'Anah (MaPrimeRénov' / MonProjetAnah)
alter table public.dossiers
  add column if not exists mpr_plateforme text check (mpr_plateforme in ('maprimerenov','monprojetanah')),
  add column if not exists mpr_parcours text check (mpr_parcours in ('geste','ampleur')),
  add column if not exists mpr_numero_dossier text,
  add column if not exists mpr_phase text check (mpr_phase in ('subvention','solde','cloture')),
  add column if not exists mpr_statut text,
  add column if not exists mpr_statut_maj_le timestamptz,
  add column if not exists mpr_montant numeric;

create table if not exists public.mpr_historique (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  organisation_id uuid default public.current_organisation_id(),
  phase text,
  statut text not null,
  source text not null default 'manuel' check (source in ('manuel','import')),
  note text,
  observe_le timestamptz not null default now(),
  cree_par uuid,
  created_at timestamptz not null default now()
);
create index if not exists mpr_historique_dossier_idx on public.mpr_historique(dossier_id, created_at desc);
alter table public.mpr_historique enable row level security;
drop policy if exists mpr_historique_select on public.mpr_historique;
create policy mpr_historique_select on public.mpr_historique for select using (public.is_super_admin() or public.dossier_visible(dossier_id));
drop policy if exists mpr_historique_insert on public.mpr_historique;
create policy mpr_historique_insert on public.mpr_historique for insert with check (public.dossier_visible(dossier_id) and organisation_id = public.current_organisation_id());
