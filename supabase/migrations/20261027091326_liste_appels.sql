-- Liste d'appels : des prospects déjà présents dans le CRM peuvent être envoyés en
-- prospection téléphonique et confiés à la personne qui fait le phoning.
alter table public.prospects add column if not exists liste_appels_le timestamptz;
alter table public.prospects add column if not exists liste_appels_par uuid references public.profiles(id) on delete set null;
create index if not exists prospects_liste_appels_idx on public.prospects (liste_appels_le) where liste_appels_le is not null;

-- Ajoute des prospects à la liste d'appels et les attribue à p_assigne.
-- Réservé aux administrateurs et managers ; seuls les prospects que l'appelant voit
-- déjà, et de la même entreprise que la personne choisie, sont pris en compte.
create or replace function public.ajouter_liste_appels(p_ids uuid[], p_assigne uuid)
returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  moi public.profiles;
  cible public.profiles;
  n integer;
begin
  select * into moi from public.profiles where id = (select auth.uid());
  if moi.id is null or not (public.is_super_admin() or moi.role in ('manager', 'commercial_manager', 'partner_admin', 'company_admin')) then
    raise exception 'Seuls les administrateurs et les managers peuvent constituer une liste d''appels.';
  end if;
  select * into cible from public.profiles where id = p_assigne;
  if cible.id is null then raise exception 'Personne introuvable.'; end if;
  if not public.is_super_admin() and cible.organisation_id is distinct from moi.organisation_id then
    raise exception 'Cette personne ne fait pas partie de votre entreprise.';
  end if;

  update public.prospects p
     set liste_appels_le = now(), liste_appels_par = moi.id,
         commercial_id = cible.id, commercial = cible.nom_complet,
         pot_commun = false
   where p.id = any(p_ids)
     and p.organisation_id = cible.organisation_id
     and public.prospect_visible(p.id);
  get diagnostics n = row_count;

  if n > 0 and cible.id <> moi.id then
    insert into public.notifications (type, titre, message, recipient_id, lue, meta)
    values ('liste_appels', 'Nouveaux prospects à appeler',
            n || case when n > 1 then ' prospects ont été ajoutés' else ' prospect a été ajouté' end || ' à votre liste d''appels.',
            cible.id, false, jsonb_build_object('source', 'liste_appels', 'nombre', n));
  end if;
  return n;
end;
$$;
revoke all on function public.ajouter_liste_appels(uuid[], uuid) from public, anon;
grant execute on function public.ajouter_liste_appels(uuid[], uuid) to authenticated;
