-- Déjà appliqué sur Supabase le 26/10/2026 (migration « agenda_abonnement_ics »).
create table if not exists public.agenda_jetons (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  jeton text not null unique,
  created_at timestamptz not null default now(),
  dernier_acces timestamptz
);
alter table public.agenda_jetons enable row level security;
revoke all on public.agenda_jetons from anon, authenticated;

create or replace function public.obtenir_jeton_agenda(p_regenerer boolean default false)
returns text language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_jeton text;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not p_regenerer then
    select jeton into v_jeton from public.agenda_jetons where user_id = (select auth.uid());
    if v_jeton is not null then return v_jeton; end if;
  end if;
  v_jeton := encode(gen_random_bytes(24), 'hex');
  insert into public.agenda_jetons (user_id, jeton) values ((select auth.uid()), v_jeton)
  on conflict (user_id) do update set jeton = excluded.jeton, created_at = now(), dernier_acces = null;
  return v_jeton;
end $$;
revoke all on function public.obtenir_jeton_agenda(boolean) from public, anon;
grant execute on function public.obtenir_jeton_agenda(boolean) to authenticated;
