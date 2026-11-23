-- Au partage d'un prospect avec un partenaire installateur (ex. Eco Green Energy) :
-- le dossier créé pour ce partenaire démarre à l'étape « Prospection · Qualifié »,
-- et la fiche prospect passe en « Qualifié » si elle était encore « Nouveau ».
create or replace function public.fn_partage_cree_dossier()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.dossiers d where d.prospect_id = new.prospect_id and d.partenaire_organisation_id = new.organisation_id) then
    insert into public.dossiers (prospect_id, statut, partenaire_organisation_id, parcours_etape, parcours_statut, parcours_maj_le, commentaires)
    values (new.prospect_id, 'creation', new.organisation_id, 'prospection', 'Qualifié', now(),
            'Dossier créé automatiquement au partage du client avec le partenaire.');
  end if;
  update public.prospects set statut = 'Qualifié'
   where id = new.prospect_id and (statut is null or statut = 'Nouveau');
  return new;
end;
$function$;

-- Dossiers déjà créés au partage, encore sans étape.
update public.dossiers d set parcours_etape = 'prospection', parcours_statut = 'Qualifié', parcours_maj_le = now()
 where d.parcours_etape is null and d.statut = 'creation' and d.partenaire_organisation_id is not null
   and exists (select 1 from public.prospect_shares s where s.prospect_id = d.prospect_id and s.organisation_id = d.partenaire_organisation_id);
