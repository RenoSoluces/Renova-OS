-- Journal d'activité (manquant en base : les déclencheurs d'audit échouaient silencieusement)
-- et remontée des erreurs de l'application, consultables par l'administration.
create table if not exists public.system_activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.system_activity_log enable row level security;
drop policy if exists "system_activity_select_authenticated" on public.system_activity_log;
drop policy if exists "system_activity_insert_authenticated" on public.system_activity_log;
drop policy if exists "journal_lecture_direction" on public.system_activity_log;
create policy "journal_lecture_direction" on public.system_activity_log for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'manager')));
drop policy if exists "journal_ecriture" on public.system_activity_log;
create policy "journal_ecriture" on public.system_activity_log for insert to authenticated
  with check (actor_id is null or actor_id = (select auth.uid()));
create index if not exists idx_system_activity_entity on public.system_activity_log(entity_type, entity_id, created_at desc);
create index if not exists idx_system_activity_created on public.system_activity_log(created_at desc);
create index if not exists idx_system_activity_erreurs on public.system_activity_log(created_at desc) where action = 'erreur_client';
create index if not exists idx_system_activity_actor on public.system_activity_log(actor_id);

-- Erreur d'interface : limitée en taille et en fréquence (30 par utilisateur et par heure).
create or replace function public.signaler_erreur_client(p_message text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return; end if;
  if (select count(*) from public.system_activity_log
       where action = 'erreur_client' and actor_id = uid and created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;
  insert into public.system_activity_log(action, entity_type, description, actor_id, meta)
  values ('erreur_client', 'system', left(coalesce(nullif(trim(p_message), ''), 'Erreur inconnue'), 500), uid,
          (select coalesce(jsonb_object_agg(k, left(v, 4000)), '{}'::jsonb)
             from jsonb_each_text(coalesce(p_details, '{}'::jsonb)) as e(k, v)));
end $$;
revoke all on function public.signaler_erreur_client(text, jsonb) from public, anon;
grant execute on function public.signaler_erreur_client(text, jsonb) to authenticated;

-- Purge : journal conservé 1 an, erreurs 90 jours.
create or replace function public.purger_journal() returns void language sql security definer set search_path to 'public' as $$
  delete from public.system_activity_log
   where (action = 'erreur_client' and created_at < now() - interval '90 days')
      or created_at < now() - interval '365 days';
$$;
revoke all on function public.purger_journal() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purger_journal';
    perform cron.schedule('purger_journal', '17 3 * * 0', 'select public.purger_journal()');
  end if;
end $$;
