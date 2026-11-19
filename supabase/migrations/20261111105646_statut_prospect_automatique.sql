-- Le statut du prospect suit ses devis : devis envoyé -> « Dossier » (étape Proposition), devis signé -> « Signé ».
-- Le statut n'est jamais reculé (un prospect déjà « Installation » ou « Installé » reste tel quel).
create or replace function public.rang_statut_prospect(p_statut text)
returns int language sql immutable as $$
  select case lower(coalesce(p_statut, ''))
    when 'nouveau' then 0 when 'qualifié' then 1 when 'visite planifiée' then 2 when 'visite faite' then 3
    when 'dossier' then 4 when 'signé' then 5 when 'installation' then 6 when 'installé' then 7
    else null end;
$$;

create or replace function public.statut_prospect_depuis_devis()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cible text;
  actuel text;
begin
  if new.prospect_id is null then return new; end if;
  if new.statut = 'signe' or new.signature_statut = 'signe' then
    cible := 'Signé';
  elsif new.statut = 'envoye' or new.signature_statut = 'envoye' then
    cible := 'Dossier';
  else
    return new;
  end if;
  select statut into actuel from public.prospects where id = new.prospect_id;
  if not found then return new; end if;
  -- statut inconnu (null) : on ne touche pas ; sinon on n'avance que si la cible est plus loin
  if public.rang_statut_prospect(actuel) is null
     or public.rang_statut_prospect(actuel) >= public.rang_statut_prospect(cible) then
    return new;
  end if;
  update public.prospects set statut = cible where id = new.prospect_id;
  insert into public.interactions (prospect_id, type, contenu, auteur, meta)
  values (new.prospect_id, 'statut', 'Étape changée : ' || cible || ' (automatique, devis ' || coalesce(new.numero, '') || ')', 'Renova',
          jsonb_build_object('automatique', true, 'devis_id', new.id));
  return new;
end;
$$;

drop trigger if exists trg_statut_prospect_depuis_devis on public.devis;
create trigger trg_statut_prospect_depuis_devis
after insert or update of statut, signature_statut on public.devis
for each row execute function public.statut_prospect_depuis_devis();
