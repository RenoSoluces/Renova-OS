-- Espace apporteur : recommandation de clients et suivi, sans accès au reste du CRM.
alter table public.prospects add column if not exists apporteur_user_id uuid references public.profiles(id) on delete set null;
create index if not exists prospects_apporteur_user_idx on public.prospects (apporteur_user_id);

-- Recommande un client : la fiche est attribuée au responsable de l'apporteur (ou à défaut à un
-- responsable de son entreprise), qui est notifié. L'apporteur ne peut pas lire la fiche complète.
create or replace function public.recommander_client(
  p_prenom text, p_nom text, p_telephone text, p_email text, p_adresse text, p_code_postal text, p_ville text,
  p_besoins text[], p_commentaire text, p_rappel text
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  moi public.profiles%rowtype;
  responsable public.profiles%rowtype;
  v_id uuid;
  v_nom_client text;
begin
  select * into moi from public.profiles where id = (select auth.uid());
  if not found then raise exception 'Profil introuvable.'; end if;
  if coalesce(trim(p_nom), '') = '' and coalesce(trim(p_prenom), '') = '' then raise exception 'Indiquez le nom du client.'; end if;
  if coalesce(trim(p_telephone), '') = '' and coalesce(trim(p_email), '') = '' then raise exception 'Indiquez un téléphone ou un e-mail.'; end if;

  select * into responsable from public.profiles where id = moi.manager_id;
  if not found then
    select * into responsable from public.profiles
     where organisation_id = moi.organisation_id and role in ('manager', 'commercial_manager', 'partner_admin', 'company_admin', 'admin')
     order by case role when 'manager' then 0 when 'commercial_manager' then 1 when 'partner_admin' then 2 when 'company_admin' then 3 else 4 end
     limit 1;
  end if;

  insert into public.prospects (
    prenom, nom, telephone, email, adresse, adresse_rue, code_postal, ville, source, statut, type_prospect,
    statut_occupation, nombre_personnes_foyer, zone_ile_de_france, fiches_cee, tags, temperature,
    commentaires, commercial, commercial_id, organisation_id, apporteur_user_id
  ) values (
    coalesce(trim(p_prenom), ''), coalesce(nullif(trim(p_nom), ''), trim(p_prenom)), nullif(trim(p_telephone), ''), nullif(trim(p_email), ''),
    nullif(trim(p_adresse), ''), nullif(trim(p_adresse), ''), nullif(trim(p_code_postal), ''), nullif(trim(p_ville), ''),
    'Apporteur d''affaires', 'Nouveau', 'particulier', 'propriétaire_occupant', 1, false, '{}',
    array['Recommandation'] || coalesce(p_besoins, '{}'), 'tiede',
    concat_ws(E'\n', 'Recommandé par ' || coalesce(moi.nom_complet, 'un apporteur'),
      case when coalesce(array_length(p_besoins, 1), 0) > 0 then 'Projet : ' || array_to_string(p_besoins, ', ') end,
      case when coalesce(trim(p_rappel), '') <> '' then 'Meilleur moment pour rappeler : ' || trim(p_rappel) end,
      nullif(trim(p_commentaire), '')),
    responsable.nom_complet, responsable.id, coalesce(moi.organisation_id, responsable.organisation_id), moi.id
  ) returning id into v_id;

  v_nom_client := trim(concat_ws(' ', p_prenom, p_nom));
  insert into public.interactions (prospect_id, type, contenu, auteur, meta)
  values (v_id, 'note', 'Client recommandé par ' || coalesce(moi.nom_complet, 'un apporteur') || coalesce(' — ' || nullif(trim(p_commentaire), ''), ''), moi.nom_complet, jsonb_build_object('canal', 'apporteur', 'apporteur_id', moi.id));

  if responsable.id is not null then
    insert into public.notifications (type, titre, message, prospect_id, recipient_id, meta)
    values ('nouveau_prospect', 'Nouvelle recommandation', coalesce(moi.nom_complet, 'Un apporteur') || ' vous recommande ' || v_nom_client || coalesce(' (' || nullif(trim(p_ville), '') || ')', '') || '. À rappeler rapidement.', v_id, responsable.id, jsonb_build_object('kind', 'recommandation', 'apporteur_id', moi.id));
  end if;
  return v_id;
end $$;
revoke all on function public.recommander_client(text, text, text, text, text, text, text, text[], text, text) from public, anon;
grant execute on function public.recommander_client(text, text, text, text, text, text, text, text[], text, text) to authenticated;

-- Suivi des recommandations de l'apporteur connecté (informations limitées, pas de coordonnées complètes).
create or replace function public.mes_recommandations()
returns table (id uuid, client text, ville text, statut text, etape text, cree_le timestamptz, derniere_activite timestamptz, montant_signe_ht numeric, commission numeric, commission_statut text)
language sql stable security definer set search_path to 'public' as $$
  select p.id,
         trim(concat_ws(' ', p.prenom, left(coalesce(p.nom, ''), 1) || case when coalesce(p.nom, '') <> '' then '.' else '' end)),
         p.ville, p.statut,
         case
           when lower(p.statut) in ('installé', 'installe') then 'Installé'
           when lower(p.statut) in ('installation', 'signé', 'signe') then 'Signé'
           when exists (select 1 from public.devis d where d.prospect_id = p.id and d.statut = 'envoye') then 'Devis envoyé'
           when exists (select 1 from public.visites v where v.prospect_id = p.id) then 'Visite technique'
           when lower(p.statut) in ('perdu', 'refusé', 'refuse') then 'Sans suite'
           when exists (select 1 from public.interactions i where i.prospect_id = p.id and coalesce(i.meta->>'canal', '') <> 'apporteur') then 'Contacté'
           else 'Reçu'
         end,
         p.created_at, coalesce(p.derniere_interaction_at, p.updated_at),
         (select sum(d.montant_ht) from public.devis d where d.prospect_id = p.id and d.statut = 'signe'),
         (select sum(c.montant_commercial) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type = 'devis' and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id)),
         (select max(c.statut) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type = 'devis' and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id))
    from public.prospects p
   where p.apporteur_user_id = (select auth.uid())
   order by p.created_at desc
   limit 300;
$$;
revoke all on function public.mes_recommandations() from public, anon;
grant execute on function public.mes_recommandations() to authenticated;
