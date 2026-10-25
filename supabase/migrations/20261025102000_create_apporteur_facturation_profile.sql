create table if not exists public.apporteur_facturation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  raison_sociale text not null default '',
  forme_juridique text not null default '',
  siret text not null default '',
  numero_tva text not null default '',
  adresse text not null default '',
  code_postal text not null default '',
  ville text not null default '',
  email_facturation text not null default '',
  telephone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apporteur_facturation enable row level security;

drop policy if exists apporteur_facturation_select_own on public.apporteur_facturation;
create policy apporteur_facturation_select_own
  on public.apporteur_facturation for select to authenticated
  using (user_id = auth.uid());

drop policy if exists apporteur_facturation_insert_own on public.apporteur_facturation;
create policy apporteur_facturation_insert_own
  on public.apporteur_facturation for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'apporteur')
  );

drop policy if exists apporteur_facturation_update_own on public.apporteur_facturation;
create policy apporteur_facturation_update_own
  on public.apporteur_facturation for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'apporteur')
  );

grant select, insert, update on public.apporteur_facturation to authenticated;
