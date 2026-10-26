-- Accès créés (apporteurs, partenaires, commerciaux) avec leur état de connexion,
-- pour renvoyer les identifiants à ceux qui ne se sont jamais connectés.
create or replace function public.acces_reseau()
returns table (
  id uuid, nom_complet text, email text, telephone text, role text, manager_id uuid,
  organisation_id uuid, organisation_nom text, organisation_type text,
  cree_le timestamptz, derniere_connexion timestamptz, active boolean
)
language sql stable security definer set search_path to 'public' as $$
  with moi as (select p.id, p.role, p.organisation_id from public.profiles p where p.id = (select auth.uid()))
  select p.id, p.nom_complet, p.email, p.telephone, p.role::text, p.manager_id,
         p.organisation_id, o.nom, o.type::text,
         coalesce(u.created_at, p.created_at), u.last_sign_in_at, u.last_sign_in_at is not null
    from public.profiles p
    join moi on true
    left join public.organisations o on o.id = p.organisation_id
    left join auth.users u on u.id = p.id
   where p.id <> moi.id
     and p.role::text <> 'admin'
     and (
       moi.role = 'admin'
       or (moi.role in ('partner_admin', 'company_admin') and p.organisation_id = moi.organisation_id)
       or (moi.role in ('manager', 'commercial_manager') and p.manager_id = moi.id)
     )
   order by (u.last_sign_in_at is not null), coalesce(u.created_at, p.created_at) desc;
$$;
revoke all on function public.acces_reseau() from public, anon;
grant execute on function public.acces_reseau() to authenticated;
