-- Planning des poses et procès-verbal de réception.
alter table public.dossiers add column if not exists duree_pose_jours integer not null default 1;
alter table public.dossiers add column if not exists planning_event_id uuid references public.planning_events(id) on delete set null;
alter table public.dossiers add column if not exists reception jsonb not null default '{}'::jsonb;
