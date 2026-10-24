-- Shared prospects keep their original organisation, but an explicitly shared
-- partner may update prospect fields without transferring ownership.
create or replace function public.set_multi_org_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor_org uuid;
begin
  select p.organisation_id into actor_org
  from public.profiles p
  where p.id = (select auth.uid());

  -- Authenticated clients cannot transfer original ownership or write another
  -- company's financial rows. Trusted service-role operations remain possible.
  if (select auth.uid()) is not null and not public.is_super_admin() then
    if tg_table_name = 'prospects' and tg_op = 'UPDATE'
      and new.organisation_id is distinct from old.organisation_id then
      raise exception 'Le partage ne transfère pas la propriété du prospect.';
    end if;
    if tg_table_name = 'prospects' and tg_op = 'UPDATE'
      and old.organisation_id is distinct from actor_org
      and new.commercial_id is distinct from old.commercial_id
      and exists (
        select 1 from public.prospect_shares s
        where s.prospect_id = old.id and s.organisation_id = actor_org
      ) then
      raise exception 'Un prospect partagé conserve son attribution d’origine ; demandez au Grand Admin un changement de propriétaire.';
    end if;
    if tg_table_name = 'prospects' and tg_op = 'INSERT' and new.organisation_id is not null
      and new.organisation_id <> actor_org then
      raise exception 'Un prospect doit appartenir à votre entreprise.';
    end if;
    if tg_table_name = 'dossiers' then
      if new.organisation_id is not null and new.organisation_id is distinct from
        (select p.organisation_id from public.prospects p where p.id = new.prospect_id) then
        raise exception 'L’entreprise propriétaire du dossier suit celle du prospect.';
      end if;
      if new.facturation_organisation_id is not null and tg_op = 'INSERT'
        and new.facturation_organisation_id <> actor_org then
        raise exception 'La facturation doit être portée par votre entreprise.';
      end if;
      if new.facturation_organisation_id is distinct from old.facturation_organisation_id
        and new.facturation_organisation_id is not null
        and new.facturation_organisation_id <> actor_org then
        raise exception 'La facturation doit être portée par votre entreprise.';
      end if;
      if new.destinataire_organisation_id is distinct from old.destinataire_organisation_id
        and new.destinataire_organisation_id is not null
        and new.destinataire_organisation_id <> actor_org then
        raise exception 'Vous ne pouvez sélectionner que votre entreprise comme destinataire ; contactez le Grand Admin pour un destinataire externe.';
      end if;
    end if;
    if tg_table_name = 'commissions' and new.organisation_id is not null
      and new.organisation_id <> actor_org then
      raise exception 'Une commission ne peut être rattachée qu’à votre entreprise.';
    end if;
    if tg_table_name = 'dossier_facturation' and new.organisation_id is not null
      and new.organisation_id <> (
        select d.facturation_organisation_id from public.dossiers d where d.id = new.dossier_id
      ) then
      raise exception 'La facture doit suivre l’entreprise de facturation du dossier.';
    end if;
    if tg_table_name = 'dossier_facturation'
      and new.destinataire_organisation_id is distinct from old.destinataire_organisation_id
      and new.destinataire_organisation_id is not null
      and new.destinataire_organisation_id <> actor_org then
      raise exception 'Vous ne pouvez sélectionner que votre entreprise comme destinataire.';
    end if;
    if tg_table_name = 'factures_clients' and new.emetteur_organisation_id is not null
      and new.emetteur_organisation_id <> actor_org then
      raise exception 'Vous ne pouvez facturer qu’au nom de votre entreprise.';
    end if;
    if tg_table_name = 'entreprises' and new.organisation_id is not null
      and new.organisation_id <> actor_org then
      raise exception 'Vous ne pouvez modifier que les informations de votre entreprise.';
    end if;
  end if;

  if tg_table_name = 'prospects' then
    if new.organisation_id is null then
      new.organisation_id := coalesce(
        (select p.organisation_id from public.profiles p where p.id = new.commercial_id),
        actor_org,
        (select id from public.organisations where nom = 'Reno Soluces')
      );
    end if;
  elsif tg_table_name = 'dossiers' then
    if new.organisation_id is null then
      new.organisation_id := (select p.organisation_id from public.prospects p where p.id = new.prospect_id);
    end if;
    if new.facturation_organisation_id is null then
      new.facturation_organisation_id := case when public.is_super_admin() then new.organisation_id else coalesce(actor_org, new.organisation_id) end;
    end if;
  elsif tg_table_name = 'commissions' then
    if new.organisation_id is null then
      new.organisation_id := coalesce(
        (select p.organisation_id from public.profiles p where p.id = new.commercial_id),
        actor_org,
        (select id from public.organisations where nom = 'Reno Soluces')
      );
    end if;
  elsif tg_table_name = 'dossier_facturation' then
    if new.organisation_id is null then
      new.organisation_id := (
        select d.facturation_organisation_id from public.dossiers d where d.id = new.dossier_id
      );
    end if;
    if new.destinataire_organisation_id is null then
      new.destinataire_organisation_id := (
        select d.destinataire_organisation_id from public.dossiers d where d.id = new.dossier_id
      );
    end if;
  elsif tg_table_name = 'entreprises' then
    if new.organisation_id is null then
      new.organisation_id := coalesce(actor_org, (select id from public.organisations where nom = 'Reno Soluces'));
    end if;
  elsif tg_table_name = 'factures_clients' then
    if new.emetteur_organisation_id is null then
      new.emetteur_organisation_id := coalesce(
        actor_org,
        (select p.organisation_id from public.prospects p where p.id = new.prospect_id)
      );
    end if;
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.set_multi_org_defaults() FROM PUBLIC, anon;
