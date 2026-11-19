-- Les apporteurs d'affaires peuvent corriger les prospects QU'ILS ont apportés, et seulement
-- leurs coordonnées et la situation du foyer. Tout le reste (statut, commercial, source,
-- commissions, fiches CEE, liste d'appels, installateur…) reste sous contrôle de Reno Soluces.
-- Dossiers, devis et documents ne leur sont pas ouverts (ils dépendent de prospect_visible,
-- qui ne les inclut pas). Une fois un devis signé, la fiche est figée pour eux.
-- Commentaires : l'apporteur ajoute, il n'efface jamais les notes de l'équipe.

drop policy if exists prospects_update_apporteur on public.prospects;
create policy prospects_update_apporteur on public.prospects
  for update to authenticated
  using (apporteur_user_id = (select auth.uid()))
  with check (apporteur_user_id = (select auth.uid()));

create or replace function public.fn_prospect_garde_apporteur()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_autorises text[] := array[
    'civilite','prenom','nom','prenom_conjoint','nom_conjoint','telephone','email',
    'adresse','adresse_rue','adresse_complement','code_postal','ville','zone_ile_de_france',
    'raison_sociale','siret','statut_occupation','nombre_personnes_foyer','rfr',
    'avis_imposition','categorie_mpr','commentaires','updated_at'];
  v_new jsonb;
  v_patch jsonb := '{}'::jsonb;
  k text;
begin
  select role into v_role from public.profiles where id = (select auth.uid());
  if v_role is distinct from 'apporteur' then return new; end if;

  if exists (select 1 from public.devis d where d.prospect_id = old.id and d.statut = 'signe') then
    raise exception 'Ce client a un devis signé : ses informations ne peuvent plus être modifiées par l''apporteur. Contactez Reno Soluces.'
      using errcode = '42501';
  end if;

  v_new := to_jsonb(new);
  foreach k in array v_autorises loop
    if v_new ? k then v_patch := v_patch || jsonb_build_object(k, v_new -> k); end if;
  end loop;
  -- Toute autre colonne reprend sa valeur d'origine.
  new := jsonb_populate_record(old, v_patch);

  -- Commentaires en ajout seulement : un texte qui ne prolonge pas l'existant est ajouté à la
  -- suite, daté et signé, au lieu de le remplacer.
  if new.commentaires is distinct from old.commentaires then
    if btrim(coalesce(new.commentaires, '')) = '' then
      new.commentaires := old.commentaires;               -- effacement refusé
    elsif coalesce(old.commentaires, '') = '' or left(new.commentaires, length(old.commentaires)) = old.commentaires then
      null;                                               -- ajout à la suite : accepté tel quel
    else
      new.commentaires := old.commentaires || E'\n\n— Ajout de l''apporteur ('
        || coalesce((select nom_complet from public.profiles where id = (select auth.uid())), 'apporteur')
        || ', ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY') || ') : ' || new.commentaires;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prospect_apporteur_garde on public.prospects;
create trigger trg_prospect_apporteur_garde
  before update on public.prospects
  for each row execute function public.fn_prospect_garde_apporteur();
