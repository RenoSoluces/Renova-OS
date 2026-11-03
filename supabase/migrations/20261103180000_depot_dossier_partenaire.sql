-- Dépôt d'un dossier complet par un partenaire (apporteur, régie, call center) : identité, foyer fiscal, travaux envisagés.
-- Les données reçues sont contrôlées et nettoyées ici : la fonction est ouverte à des comptes externes.
CREATE OR REPLACE FUNCTION public.deposer_dossier(p_donnees jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  moi public.profiles%rowtype;
  responsable public.profiles%rowtype;
  v_id uuid;
  v_prenom text := left(trim(coalesce(p_donnees->>'prenom', '')), 80);
  v_nom text := left(trim(coalesce(p_donnees->>'nom', '')), 80);
  v_tel text := left(trim(coalesce(p_donnees->>'telephone', '')), 30);
  v_email text := left(trim(coalesce(p_donnees->>'email', '')), 120);
  v_cp text := left(trim(coalesce(p_donnees->>'code_postal', '')), 10);
  v_occupation text := coalesce(nullif(p_donnees->>'statut_occupation', ''), 'propriétaire_occupant');
  v_personnes int := coalesce(nullif(p_donnees->>'nombre_personnes_foyer', '')::int, 1);
  v_rfr numeric := nullif(p_donnees->>'rfr', '')::numeric;
  v_cat text := nullif(p_donnees->>'categorie_mpr', '');
  v_fiches text[];
  v_besoins text[];
  v_avis jsonb;
  v_source text;
  v_nom_client text;
begin
  select * into moi from public.profiles where id = (select auth.uid());
  if not found then raise exception 'Profil introuvable.'; end if;
  if v_nom = '' and v_prenom = '' then raise exception 'Indiquez le nom du client.'; end if;
  if v_tel = '' and v_email = '' then raise exception 'Indiquez un téléphone ou un e-mail.'; end if;
  if v_occupation not in ('propriétaire_occupant', 'locataire', 'bailleur', 'syndic') then raise exception 'Statut d''occupation invalide.'; end if;
  if v_personnes < 1 or v_personnes > 20 then raise exception 'Nombre de personnes du foyer invalide.'; end if;
  if v_rfr is not null and (v_rfr < 0 or v_rfr > 10000000) then raise exception 'Revenu fiscal de référence invalide.'; end if;
  if v_cat is not null and v_cat not in ('TresModeste', 'Modeste', 'Intermediaire', 'Aisee') then v_cat := null; end if;

  select coalesce(array_agg(f), '{}') into v_fiches
    from (select distinct upper(left(trim(x), 20)) f from jsonb_array_elements_text(coalesce(p_donnees->'fiches_cee', '[]'::jsonb)) x limit 20) s
   where f ~ '^[A-Z0-9-]{3,20}$';
  select coalesce(array_agg(b), '{}') into v_besoins
    from (select distinct left(trim(x), 60) b from jsonb_array_elements_text(coalesce(p_donnees->'besoins', '[]'::jsonb)) x limit 12) s
   where b <> '';

  -- Avis d'imposition : on ne garde que les champs attendus, tronqués, 6 avis au maximum.
  select coalesce(jsonb_agg(jsonb_build_object(
           'numero_fiscal', left(coalesce(a->>'numero_fiscal', ''), 20),
           'reference_avis', left(coalesce(a->>'reference_avis', ''), 20),
           'rfr', coalesce(nullif(a->>'rfr', ''), '0'),
           'date_naissance', left(coalesce(a->>'date_naissance', ''), 10),
           'nb_personnes', least(greatest(coalesce(nullif(a->>'nb_personnes', '')::int, 1), 1), 20)
         )), '[]'::jsonb) into v_avis
    from (select a from jsonb_array_elements(case when jsonb_typeof(p_donnees->'avis_imposition') = 'array' then p_donnees->'avis_imposition' else '[]'::jsonb end) a limit 6) s;

  select * into responsable from public.profiles where id = moi.manager_id;
  if not found then
    select * into responsable from public.profiles
     where organisation_id = moi.organisation_id and role in ('manager', 'commercial_manager', 'partner_admin', 'company_admin', 'admin')
     order by case role when 'manager' then 0 when 'commercial_manager' then 1 when 'partner_admin' then 2 when 'company_admin' then 3 else 4 end
     limit 1;
  end if;

  v_source := case moi.role when 'teleconseiller' then 'Call center' else 'Apporteur d''affaires' end;

  insert into public.prospects (
    prenom, nom, telephone, email, adresse, adresse_rue, code_postal, ville, source, statut, type_prospect,
    statut_occupation, nombre_personnes_foyer, rfr, avis_imposition, categorie_mpr, zone_ile_de_france, fiches_cee,
    tags, temperature, commentaires, commercial, commercial_id, organisation_id, apporteur_user_id
  ) values (
    v_prenom, coalesce(nullif(v_nom, ''), v_prenom), nullif(v_tel, ''), nullif(v_email, ''),
    nullif(left(trim(coalesce(p_donnees->>'adresse', '')), 200), ''), nullif(left(trim(coalesce(p_donnees->>'adresse', '')), 200), ''),
    nullif(v_cp, ''), nullif(left(trim(coalesce(p_donnees->>'ville', '')), 80), ''), v_source, 'Nouveau', 'particulier',
    v_occupation, v_personnes, v_rfr, v_avis, v_cat, left(v_cp, 2) in ('75', '77', '78', '91', '92', '93', '94', '95'), v_fiches,
    array['Dossier déposé'] || v_besoins, 'tiede',
    concat_ws(E'\n', 'Dossier déposé par ' || coalesce(moi.nom_complet, 'un partenaire'),
      case when coalesce(array_length(v_besoins, 1), 0) > 0 then 'Projet : ' || array_to_string(v_besoins, ', ') end,
      case when coalesce(trim(p_donnees->>'rappel'), '') <> '' then 'Meilleur moment pour rappeler : ' || left(trim(p_donnees->>'rappel'), 60) end,
      nullif(left(trim(coalesce(p_donnees->>'commentaire', '')), 2000), '')),
    responsable.nom_complet, responsable.id, coalesce(moi.organisation_id, responsable.organisation_id), moi.id
  ) returning id into v_id;

  v_nom_client := trim(concat_ws(' ', v_prenom, v_nom));
  insert into public.interactions (prospect_id, type, contenu, auteur, meta)
  values (v_id, 'note', 'Dossier complet déposé par ' || coalesce(moi.nom_complet, 'un partenaire'), moi.nom_complet,
          jsonb_build_object('canal', 'apporteur', 'apporteur_id', moi.id, 'dossier_complet', true));

  if responsable.id is not null then
    insert into public.notifications (type, titre, message, prospect_id, recipient_id, meta)
    values ('nouveau_prospect', 'Nouveau dossier déposé', coalesce(moi.nom_complet, 'Un partenaire') || ' a déposé le dossier de ' || v_nom_client || '. À rappeler rapidement.', v_id, responsable.id,
            jsonb_build_object('kind', 'dossier_depose', 'apporteur_id', moi.id));
  end if;
  return v_id;
end $function$;
REVOKE ALL ON FUNCTION public.deposer_dossier(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deposer_dossier(jsonb) TO authenticated;

-- Suivi côté partenaire : mêmes colonnes que mes_recommandations() plus l'étape et le statut du parcours (lecture seule).
-- Nouvelle fonction : mes_recommandations() n'est pas modifiée.
CREATE OR REPLACE FUNCTION public.mes_dossiers_partenaire()
RETURNS TABLE(id uuid, client text, ville text, statut text, etape text, cree_le timestamptz, derniere_activite timestamptz,
              montant_signe_ht numeric, commission numeric, commission_statut text, parcours_etape text, parcours_statut text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select r.id, r.client, r.ville, r.statut, r.etape, r.cree_le, r.derniere_activite, r.montant_signe_ht, r.commission, r.commission_statut,
         (select d.parcours_etape from public.dossiers d where d.prospect_id = r.id order by d.created_at desc limit 1),
         (select d.parcours_statut from public.dossiers d where d.prospect_id = r.id order by d.created_at desc limit 1)
    from public.mes_recommandations() r;
$function$;
REVOKE ALL ON FUNCTION public.mes_dossiers_partenaire() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mes_dossiers_partenaire() TO authenticated;

NOTIFY pgrst, 'reload schema';
