-- Un dossier par partenaire : partager un client avec un partenaire (prospect_shares) crée un dossier dédié,
-- identifié par partenaire_organisation_id (sans effet sur la facturation). Le dossier d'un autre installateur reste à part.
alter table public.dossiers add column if not exists partenaire_organisation_id uuid references public.organisations(id) on delete set null;
create index if not exists idx_dossiers_partenaire_org on public.dossiers (partenaire_organisation_id) where partenaire_organisation_id is not null;

create or replace function public.fn_dossier_installateur_par_defaut()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.installateur_id is null and new.partenaire_organisation_id is null then
    select coalesce(
      (select d.emetteur_installateur_id from public.devis d where d.id = new.devis_id),
      (select p.installateur_id from public.prospects p where p.id = new.prospect_id)
    ) into new.installateur_id;
  end if;
  return new;
end;
$$;
revoke all on function public.fn_dossier_installateur_par_defaut() from public, anon, authenticated;

create or replace function public.fn_partage_cree_dossier()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.dossiers d where d.prospect_id = new.prospect_id and d.partenaire_organisation_id = new.organisation_id) then
    insert into public.dossiers (prospect_id, statut, partenaire_organisation_id, commentaires)
    values (new.prospect_id, 'creation', new.organisation_id, 'Dossier créé automatiquement au partage du client avec le partenaire.');
  end if;
  return new;
end;
$$;
revoke all on function public.fn_partage_cree_dossier() from public, anon, authenticated;

drop trigger if exists trg_partage_cree_dossier on public.prospect_shares;
create trigger trg_partage_cree_dossier after insert on public.prospect_shares
  for each row execute function public.fn_partage_cree_dossier();

-- Reprise des partages existants.
insert into public.dossiers (prospect_id, statut, partenaire_organisation_id, commentaires)
select s.prospect_id, 'creation', s.organisation_id, 'Dossier créé automatiquement au partage du client avec le partenaire.'
from public.prospect_shares s
where not exists (select 1 from public.dossiers d where d.prospect_id = s.prospect_id and d.partenaire_organisation_id = s.organisation_id);
