create table if not exists public.installateur_evaluations (
  id uuid primary key default gen_random_uuid(),
  installateur_id uuid not null references public.installateurs(id) on delete cascade,
  auteur_id uuid not null references public.profiles(id) on delete cascade,
  note_globale smallint not null check (note_globale between 1 and 5),
  note_qualite smallint check (note_qualite between 1 and 5),
  note_delais smallint check (note_delais between 1 and 5),
  note_communication smallint check (note_communication between 1 and 5),
  note_sav smallint check (note_sav between 1 and 5),
  commentaire text not null check (length(trim(commentaire)) > 0),
  contexte text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists installateur_evaluations_installateur_created_idx
  on public.installateur_evaluations (installateur_id, created_at desc);
create index if not exists installateur_evaluations_auteur_idx
  on public.installateur_evaluations (auteur_id);
alter table public.installateur_evaluations enable row level security;
drop policy if exists "Authenticated users can read installer evaluations" on public.installateur_evaluations;
create policy "Authenticated users can read installer evaluations"
  on public.installateur_evaluations for select to authenticated using (true);
drop policy if exists "Users can create their own installer evaluations" on public.installateur_evaluations;
create policy "Users can create their own installer evaluations"
  on public.installateur_evaluations for insert to authenticated with check (auteur_id = auth.uid());
drop policy if exists "Users can update their own installer evaluations" on public.installateur_evaluations;
create policy "Users can update their own installer evaluations"
  on public.installateur_evaluations for update to authenticated using (auteur_id = auth.uid()) with check (auteur_id = auth.uid());
drop policy if exists "Users can delete their own installer evaluations" on public.installateur_evaluations;
create policy "Users can delete their own installer evaluations"
  on public.installateur_evaluations for delete to authenticated using (auteur_id = auth.uid());

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users can add their own push subscriptions" on public.push_subscriptions;
create policy "Users can add their own push subscriptions"
  on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
