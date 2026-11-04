-- Rôles d'une entreprise installatrice : confirmateur (confirmations de rendez-vous et de vente),
-- administratif (ADV : voit tous les dossiers de l'entreprise, jamais les commissions) et régies.

-- Régies : équipes commerciales rattachées à l'entreprise. Un commercial d'une régie ne voit que ses propres affaires,
-- le chef de régie (responsable commercial) voit son équipe via la hiérarchie existante.
create table if not exists public.regies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default public.current_organisation_id() references public.organisations(id) on delete cascade,
  nom text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.regies enable row level security;
create policy regies_select on public.regies for select
  using (public.is_super_admin() or organisation_id = public.current_organisation_id());
create policy regies_ecriture on public.regies for all
  using (public.is_super_admin() or (organisation_id = public.current_organisation_id() and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('partner_admin','company_admin'))))
  with check (public.is_super_admin() or (organisation_id = public.current_organisation_id() and exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('partner_admin','company_admin'))));

alter table public.profiles add column if not exists regie_id uuid references public.regies(id) on delete set null;

create or replace function public.affecter_regie(p_user uuid, p_regie uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_org uuid; v_org_user uuid; v_org_regie uuid;
begin
  select role, organisation_id into v_role, v_org from profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','partner_admin','company_admin') then raise exception 'Droits insuffisants'; end if;
  select organisation_id into v_org_user from profiles where id = p_user;
  if v_org_user is null then raise exception 'Utilisateur introuvable'; end if;
  if v_role <> 'admin' and v_org_user <> v_org then raise exception 'Utilisateur d''une autre entreprise'; end if;
  if p_regie is not null then
    select organisation_id into v_org_regie from regies where id = p_regie;
    if v_org_regie is distinct from v_org_user then raise exception 'Régie d''une autre entreprise'; end if;
  end if;
  update profiles set regie_id = p_regie where id = p_user;
end $$;
revoke all on function public.affecter_regie(uuid, uuid) from public;
grant execute on function public.affecter_regie(uuid, uuid) to authenticated;

-- Administratif : même visibilité que la direction sur les prospects et dossiers de son entreprise.
create or replace function public.prospect_visible(p_prospect_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.prospects p
      LEFT JOIN public.profiles owner_profile ON owner_profile.id = p.commercial_id
      WHERE p.id = p_prospect_id
        AND (
          (p.commercial_id = (SELECT auth.uid())
            AND p.organisation_id = public.current_organisation_id())
          OR (owner_profile.manager_id = (SELECT auth.uid())
            AND p.organisation_id = public.current_organisation_id())
          OR (
            p.organisation_id = public.current_organisation_id()
            AND EXISTS (
              SELECT 1 FROM public.profiles me
              WHERE me.id = (SELECT auth.uid())
                AND me.role IN ('partner_admin', 'company_admin', 'adv')
            )
          )
          OR (
            p.commercial_id IS NULL
            AND COALESCE(p.pot_commun, false) = true
            AND EXISTS (
              SELECT 1 FROM public.organisations o
              WHERE o.id = public.current_organisation_id() AND o.type = 'interne'
            )
          )
          OR EXISTS (
            SELECT 1 FROM public.prospect_shares s
            WHERE s.prospect_id = p.id
              AND s.organisation_id = public.current_organisation_id()
          )
        )
    );
$function$;

-- Confirmations : le confirmateur n'a pas accès aux fiches complètes ; il passe par deux fonctions qui ne renvoient que
-- l'utile (identité, téléphone, créneau, adresse, produits), jamais de prix ni de commission.
create table if not exists public.confirmations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default public.current_organisation_id() references public.organisations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  devis_id uuid references public.devis(id) on delete set null,
  evenement_id uuid,
  type text not null check (type in ('rdv','vente')),
  statut text not null check (statut in ('confirme','a_rappeler','injoignable','annule')),
  note text,
  cree_par uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists confirmations_prospect_idx on public.confirmations(prospect_id, created_at desc);
alter table public.confirmations enable row level security;
create policy confirmations_select on public.confirmations for select
  using (public.is_super_admin() or public.prospect_visible(prospect_id));

create or replace function public.confirmations_a_faire()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_org uuid; v_rdv jsonb; v_ventes jsonb;
begin
  select role, organisation_id into v_role, v_org from profiles where id = auth.uid();
  if v_role is null or v_role not in ('confirmateur','partner_admin','company_admin','commercial_manager','admin') then
    raise exception 'Droits insuffisants';
  end if;
  select coalesce(jsonb_agg(x order by x->>'date', x->>'heure'), '[]'::jsonb) into v_rdv from (
    select jsonb_build_object(
      'evenement_id', e.id, 'prospect_id', p.id, 'titre', e.titre, 'date', e.date, 'heure', e.heure, 'type', e.type,
      'adresse', coalesce(nullif(e.adresse,''), concat_ws(' ', p.adresse, p.code_postal, p.ville)),
      'nom', p.nom, 'prenom', p.prenom, 'telephone', p.telephone, 'ville', p.ville,
      'commercial', pr.nom_complet,
      'derniere_statut', c.statut, 'derniere_note', c.note, 'derniere_le', c.created_at) as x
    from planning_events e
    join prospects p on p.id = e.prospect_id and p.organisation_id = v_org
    left join profiles pr on pr.id = e.user_id
    left join lateral (select statut, note, created_at from confirmations c where c.evenement_id = e.id order by created_at desc limit 1) c on true
    where e.type in ('rdv','visite') and e.date between current_date and current_date + 7
      and coalesce(c.statut,'') <> 'annule'
  ) t;
  select coalesce(jsonb_agg(x order by x->>'signature_date' desc), '[]'::jsonb) into v_ventes from (
    select jsonb_build_object(
      'devis_id', d.id, 'prospect_id', p.id, 'numero', d.numero, 'signature_date', d.signature_date,
      'nom', p.nom, 'prenom', p.prenom, 'telephone', p.telephone, 'ville', p.ville,
      'commercial', pr.nom_complet,
      'produits', (select string_agg(l.designation, ', ' order by l.ordre) from devis_lignes l where l.devis_id = d.id),
      'derniere_statut', c.statut, 'derniere_note', c.note, 'derniere_le', c.created_at) as x
    from devis d
    join prospects p on p.id = d.prospect_id and p.organisation_id = v_org
    left join profiles pr on pr.id = p.commercial_id
    left join lateral (select statut, note, created_at from confirmations c where c.devis_id = d.id and c.type = 'vente' order by created_at desc limit 1) c on true
    where d.signature_statut = 'signe' and d.signature_date >= now() - interval '21 days'
      and coalesce(c.statut,'') not in ('confirme','annule')
  ) t;
  return jsonb_build_object('rdv', v_rdv, 'ventes', v_ventes);
end $$;
revoke all on function public.confirmations_a_faire() from public;
grant execute on function public.confirmations_a_faire() to authenticated;

create or replace function public.enregistrer_confirmation(p_type text, p_prospect uuid, p_devis uuid, p_evenement uuid, p_statut text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_org uuid; v_org_prospect uuid;
begin
  select role, organisation_id into v_role, v_org from profiles where id = auth.uid();
  if v_role is null or v_role not in ('confirmateur','partner_admin','company_admin','commercial_manager','admin') then
    raise exception 'Droits insuffisants';
  end if;
  select organisation_id into v_org_prospect from prospects where id = p_prospect;
  if v_org_prospect is null or (v_role <> 'admin' and v_org_prospect <> v_org) then raise exception 'Prospect introuvable'; end if;
  insert into confirmations(organisation_id, prospect_id, devis_id, evenement_id, type, statut, note)
  values (v_org_prospect, p_prospect, p_devis, p_evenement, p_type, p_statut, nullif(trim(coalesce(p_note,'')),''));
end $$;
revoke all on function public.enregistrer_confirmation(text, uuid, uuid, uuid, text, text) from public;
grant execute on function public.enregistrer_confirmation(text, uuid, uuid, uuid, text, text) to authenticated;
