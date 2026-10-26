-- Suivi des dossiers d'aides (CEE, MaPrimeRénov') : aides concernées, dates clés, pièces obligatoires
-- et date de la dernière demande de pièces au client.
alter table public.dossiers add column if not exists aides text[] not null default '{}';
alter table public.dossiers add column if not exists suivi_aides jsonb not null default '{}'::jsonb;
alter table public.documents add column if not exists obligatoire boolean not null default false;
alter table public.documents add column if not exists etape text;
alter table public.documents add column if not exists demande_le timestamptz;
