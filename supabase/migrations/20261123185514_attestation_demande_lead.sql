-- Attestation de demande (contrat de partenariat) : pour chaque lead apporté par un partenaire, celui-ci certifie que le contact
-- a lui-même demandé à être contacté, avec la date et le mode de la demande. Obligatoire pour valider la fiche.
alter table public.prospects
  add column if not exists attestation_demande boolean,
  add column if not exists attestation_demande_le timestamptz,
  add column if not exists attestation_demande_par uuid references public.profiles(id) on delete set null,
  add column if not exists demande_date date,
  add column if not exists demande_mode text;
alter table public.prospects drop constraint if exists prospects_demande_mode_check;
alter table public.prospects add constraint prospects_demande_mode_check
  check (demande_mode is null or demande_mode in ('formulaire', 'appel_entrant', 'message', 'parrainage'));

create or replace function public.fn_prospect_attestation_obligatoire()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_role text; v_type text;
begin
  if auth.uid() is null then return new; end if;
  select p.role, o.type into v_role, v_type from public.profiles p left join public.organisations o on o.id = p.organisation_id where p.id = auth.uid();
  if v_role in ('apporteur', 'teleconseiller') or coalesce(v_type, 'interne') <> 'interne' then
    if new.attestation_demande is not true or new.demande_date is null or new.demande_mode is null then
      raise exception 'Attestation de demande obligatoire : cochez l''attestation et indiquez la date et la manière dont le contact a fait sa demande.';
    end if;
    if new.demande_date > current_date then raise exception 'La date de la demande ne peut pas être dans le futur.'; end if;
    new.attestation_demande_le := coalesce(new.attestation_demande_le, now());
    new.attestation_demande_par := coalesce(new.attestation_demande_par, auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.fn_prospect_attestation_obligatoire() from public, anon, authenticated;
drop trigger if exists trg_prospect_attestation_obligatoire on public.prospects;
create trigger trg_prospect_attestation_obligatoire before insert on public.prospects for each row execute function public.fn_prospect_attestation_obligatoire();

-- recommander_client : trois paramètres obligatoires en plus (ancienne signature supprimée).
drop function if exists public.recommander_client(text, text, text, text, text, text, text, text[], text, text);
create or replace function public.recommander_client(p_prenom text, p_nom text, p_telephone text, p_email text, p_adresse text, p_code_postal text, p_ville text, p_besoins text[], p_commentaire text, p_rappel text,
  p_demande_date date, p_demande_mode text, p_attestation boolean)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
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
  if p_attestation is not true then raise exception 'Attestation de demande obligatoire : cochez l''attestation.'; end if;
  if p_demande_date is null or p_demande_date > current_date then raise exception 'Indiquez la date de la demande du contact (pas dans le futur).'; end if;
  if p_demande_mode is null or p_demande_mode not in ('formulaire', 'appel_entrant', 'message', 'parrainage') then raise exception 'Indiquez comment le contact a fait sa demande.'; end if;

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
    commentaires, commercial, commercial_id, organisation_id, apporteur_user_id,
    attestation_demande, attestation_demande_le, attestation_demande_par, demande_date, demande_mode
  ) values (
    coalesce(trim(p_prenom), ''), coalesce(nullif(trim(p_nom), ''), trim(p_prenom)), nullif(trim(p_telephone), ''), nullif(trim(p_email), ''),
    nullif(trim(p_adresse), ''), nullif(trim(p_adresse), ''), nullif(trim(p_code_postal), ''), nullif(trim(p_ville), ''),
    'Apporteur d''affaires', 'Nouveau', 'particulier', 'propriétaire_occupant', 1, false, '{}',
    array['Recommandation'] || coalesce(p_besoins, '{}'), 'tiede',
    concat_ws(E'\n', 'Recommandé par ' || coalesce(moi.nom_complet, 'un apporteur'),
      case when coalesce(array_length(p_besoins, 1), 0) > 0 then 'Projet : ' || array_to_string(p_besoins, ', ') end,
      case when coalesce(trim(p_rappel), '') <> '' then 'Meilleur moment pour rappeler : ' || trim(p_rappel) end,
      nullif(trim(p_commentaire), '')),
    responsable.nom_complet, responsable.id, coalesce(moi.organisation_id, responsable.organisation_id), moi.id,
    true, now(), moi.id, p_demande_date, p_demande_mode
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
grant execute on function public.recommander_client(text, text, text, text, text, text, text, text[], text, text, date, text, boolean) to authenticated;

-- deposer_dossier : mêmes exigences via p_donnees (attestation, demande_date, demande_mode).
do $mig$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.deposer_dossier(jsonb)'::regprocedure);
  d2 := replace(d, E'  if not found then raise exception ''Profil introuvable.''; end if;\n  if v_nom = ''''',
    E'  if not found then raise exception ''Profil introuvable.''; end if;\n  if coalesce(p_donnees->>''attestation'', ''false'') <> ''true'' then raise exception ''Attestation de demande obligatoire : cochez l''''attestation.''; end if;\n  if nullif(p_donnees->>''demande_date'', '''') is null or (p_donnees->>''demande_date'')::date > current_date then raise exception ''Indiquez la date de la demande du contact (pas dans le futur).''; end if;\n  if coalesce(p_donnees->>''demande_mode'', '''') not in (''formulaire'', ''appel_entrant'', ''message'', ''parrainage'') then raise exception ''Indiquez comment le contact a fait sa demande.''; end if;\n  if v_nom = ''''');
  d2 := replace(d2, 'raison_sociale, tags, temperature, commentaires, commercial, commercial_id, organisation_id, apporteur_user_id' || E'\n  ) values (',
    'raison_sociale, tags, temperature, commentaires, commercial, commercial_id, organisation_id, apporteur_user_id,' || E'\n    attestation_demande, attestation_demande_le, attestation_demande_par, demande_date, demande_mode\n  ) values (');
  d2 := replace(d2, 'responsable.nom_complet, responsable.id, coalesce(moi.organisation_id, responsable.organisation_id), moi.id' || E'\n  ) returning id into v_id;',
    'responsable.nom_complet, responsable.id, coalesce(moi.organisation_id, responsable.organisation_id), moi.id,' || E'\n    true, now(), moi.id, (p_donnees->>''demande_date'')::date, p_donnees->>''demande_mode''\n  ) returning id into v_id;');
  if position('attestation_demande_par, demande_date' in d2) = 0 or position('true, now(), moi.id' in d2) = 0 or position('Attestation de demande obligatoire' in d2) = 0 then
    raise exception 'deposer_dossier : motifs introuvables, migration annulée';
  end if;
  execute d2;
end $mig$;
