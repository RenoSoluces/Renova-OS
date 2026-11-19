-- Portail client : lien personnel (sans compte) pour suivre son projet, déposer ses pièces et signer son devis.
create table if not exists public.portail_acces (
  id uuid primary key default gen_random_uuid(),
  jeton text not null unique default encode(gen_random_bytes(24), 'hex'),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  dossier_id uuid references public.dossiers(id) on delete set null,
  devis_id uuid references public.devis(id) on delete set null,
  cree_par uuid references public.profiles(id) on delete set null,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null default now() + interval '120 days',
  dernier_acces timestamptz,
  actif boolean not null default true
);
create index if not exists portail_acces_prospect_idx on public.portail_acces (prospect_id);
alter table public.portail_acces enable row level security;
-- Lecture par l'équipe qui voit le prospect ; écriture uniquement via les fonctions.
drop policy if exists portail_acces_lecture on public.portail_acces;
create policy portail_acces_lecture on public.portail_acces for select to authenticated using (public.prospect_visible(prospect_id));
grant select on public.portail_acces to authenticated;

-- Codes de signature envoyés par e-mail (empreinte uniquement).
create table if not exists public.portail_codes (
  id uuid primary key default gen_random_uuid(),
  acces_id uuid not null references public.portail_acces(id) on delete cascade,
  code_hash text not null,
  expire_le timestamptz not null,
  tentatives integer not null default 0,
  utilise boolean not null default false,
  cree_le timestamptz not null default now()
);
alter table public.portail_codes enable row level security;

-- Crée (ou réutilise) le lien du client. Réservé à l'équipe qui voit le prospect.
create or replace function public.creer_lien_portail(p_prospect_id uuid, p_dossier_id uuid default null, p_devis_id uuid default null)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_jeton text;
begin
  if not public.prospect_visible(p_prospect_id) then raise exception 'Client introuvable ou non autorisé.'; end if;
  select jeton into v_jeton from public.portail_acces
   where prospect_id = p_prospect_id and actif and expire_le > now() + interval '7 days'
   order by cree_le desc limit 1;
  if v_jeton is not null then
    update public.portail_acces set
      dossier_id = coalesce(p_dossier_id, dossier_id), devis_id = coalesce(p_devis_id, devis_id),
      expire_le = greatest(expire_le, now() + interval '120 days')
     where jeton = v_jeton;
    return v_jeton;
  end if;
  insert into public.portail_acces (prospect_id, dossier_id, devis_id, cree_par)
  values (p_prospect_id, p_dossier_id, p_devis_id, (select auth.uid())) returning jeton into v_jeton;
  return v_jeton;
end $$;
revoke all on function public.creer_lien_portail(uuid, uuid, uuid) from public, anon;
grant execute on function public.creer_lien_portail(uuid, uuid, uuid) to authenticated;
