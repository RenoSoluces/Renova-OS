-- Notifications des apporteurs : avancement de leurs recommandations et commission calculée.
create or replace function public.normaliser_statut_notif(s text)
returns text language sql immutable set search_path to 'public'
as $$ select lower(translate(btrim(coalesce(s, '')), 'éèêàâîïôùûç_', 'eeeaaiioouuc ')) $$;

create or replace function public.notify_apporteur_prospect_change()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_etape text;
  v_client text;
begin
  if new.apporteur_user_id is null or new.statut is not distinct from old.statut then return new; end if;
  v_etape := case public.normaliser_statut_notif(new.statut)
    when 'qualifie' then 'a été contacté et qualifié'
    when 'visite planifiee' then 'a une visite technique planifiée'
    when 'visite faite' then 'a eu sa visite technique'
    when 'dossier' then 'a reçu son devis, le dossier est en cours'
    when 'signe' then 'a signé son devis'
    when 'installation' then 'est en cours d''installation'
    when 'installe' then 'est installé'
    when 'perdu' then 'est classé sans suite'
    when 'refuse' then 'est classé sans suite'
    else null end;
  if v_etape is null then return new; end if;
  v_client := trim(concat_ws(' ', new.prenom, new.nom));
  insert into public.notifications (type, titre, message, prospect_id, recipient_id, lue, meta)
  values ('evolution_dossier', 'Votre recommandation avance', v_client || ' ' || v_etape || '.', new.id, new.apporteur_user_id, false,
          jsonb_build_object('source', 'apporteur_trigger', 'statut', new.statut));
  return new;
end;
$$;
revoke all on function public.notify_apporteur_prospect_change() from public, anon, authenticated;

drop trigger if exists trg_notify_apporteur_prospect on public.prospects;
create trigger trg_notify_apporteur_prospect after update of statut on public.prospects
  for each row execute function public.notify_apporteur_prospect_change();

create or replace function public.notify_apporteur_commission()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_client text; v_prospect uuid;
begin
  if new.reference_type is distinct from 'devis_apporteur' or coalesce(new.montant_commercial, 0) <= 0 then return new; end if;
  select p.id, trim(concat_ws(' ', p.prenom, p.nom)) into v_prospect, v_client
    from public.devis d join public.prospects p on p.id = d.prospect_id where d.id = new.reference_id;
  insert into public.notifications (type, titre, message, prospect_id, recipient_id, lue, meta)
  values ('commission', 'Votre commission est calculée', 'Commission de ' || to_char(new.montant_commercial, 'FM999G990D00') || ' € pour ' || coalesce(v_client, 'votre recommandation') || '.',
          v_prospect, new.commercial_id, false, jsonb_build_object('source', 'apporteur_commission', 'commission_id', new.id));
  return new;
end;
$$;
revoke all on function public.notify_apporteur_commission() from public, anon, authenticated;

drop trigger if exists trg_notify_apporteur_commission on public.commissions;
create trigger trg_notify_apporteur_commission after insert on public.commissions
  for each row when (new.reference_type = 'devis_apporteur') execute function public.notify_apporteur_commission();
