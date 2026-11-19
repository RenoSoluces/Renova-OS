-- Challenges calculés automatiquement depuis les commissions société validées.
-- Règle d'attribution (une seule personne par devis signé, pas de double compte) :
--   1. prospect trouvé par la prospection de Claude (source « Prospection pro… » ou tag
--      « Prospection pro ») → participant « Claude » ;
--   2. sinon, commercial du prospect participant au challenge → ce commercial ;
--   3. sinon (autre commercial de l'équipe) → le créateur du challenge.
-- Période : date de signature du devis entre date_debut et date_fin du challenge.

alter table public.challenges
  add column if not exists calcul_auto text
  check (calcul_auto is null or calcul_auto = 'commissions_societe');
comment on column public.challenges.calcul_auto is
  'null = scores saisis à la main ; commissions_societe = scores recalculés depuis les commissions société validées ou payées.';

-- Un participant peut ne pas avoir de compte Renova (ex. « Claude ») : il est alors nommé.
alter table public.challenge_scores alter column participant_id drop not null;
alter table public.challenge_scores add column if not exists participant_nom text;
alter table public.challenge_scores drop constraint if exists challenge_scores_participant_present;
alter table public.challenge_scores add constraint challenge_scores_participant_present
  check (participant_id is not null or nullif(btrim(participant_nom), '') is not null);
create unique index if not exists challenge_scores_participant_nom_uniq
  on public.challenge_scores (challenge_id, participant_nom) where participant_id is null;

create or replace function public.fn_challenge_recalcul(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c public.challenges%rowtype;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if not found or c.calcul_auto is distinct from 'commissions_societe' then return; end if;

  create temp table if not exists tmp_challenge_points (participant_id uuid, participant_nom text, points numeric, nb int) on commit drop;
  delete from tmp_challenge_points;

  insert into tmp_challenge_points
  with lignes as (
    select
      cm.montant_societe,
      case
        when p.source ilike 'Prospection pro%' or 'Prospection pro' = any(coalesce(p.tags, '{}')) then null
        when exists (select 1 from public.challenge_scores s where s.challenge_id = c.id and s.participant_id = p.commercial_id)
          then p.commercial_id
        else c.created_by
      end as participant_id,
      case when p.source ilike 'Prospection pro%' or 'Prospection pro' = any(coalesce(p.tags, '{}')) then 'Claude' end as participant_nom
    from public.commissions cm
    join public.devis v on v.id = cm.reference_id and cm.reference_type = 'devis'
    join public.prospects p on p.id = v.prospect_id
    where cm.type = 'devis_signe'
      and cm.statut in ('validee', 'payee')
      and p.organisation_id = c.organisation_id
      and coalesce(v.signature_date, cm.date_generation)::date between c.date_debut and c.date_fin
  )
  select participant_id, participant_nom, sum(montant_societe), count(*)
  from lignes group by 1, 2;

  -- Participants déjà inscrits (comptes) : remis à leur total, 0 s'ils n'ont rien.
  update public.challenge_scores s
     set points = coalesce(t.points, 0),
         commentaire = case when coalesce(t.nb, 0) = 0 then 'Calcul automatique : aucun devis validé'
                            else 'Calcul automatique : ' || t.nb || ' devis validé(s)' end,
         updated_at = now()
    from (select s2.id, t.points, t.nb
            from public.challenge_scores s2
            left join tmp_challenge_points t
              on (t.participant_id is not null and t.participant_id = s2.participant_id)
              or (t.participant_id is null and s2.participant_id is null and t.participant_nom = s2.participant_nom)
           where s2.challenge_id = c.id) t
   where s.id = t.id;

  -- Nouveaux participants (créateur absent du classement, « Claude »).
  insert into public.challenge_scores (challenge_id, participant_id, participant_nom, points, commentaire, updated_at)
  select c.id, t.participant_id, t.participant_nom, t.points, 'Calcul automatique : ' || t.nb || ' devis validé(s)', now()
    from tmp_challenge_points t
   where not exists (
     select 1 from public.challenge_scores s
      where s.challenge_id = c.id
        and ((t.participant_id is not null and s.participant_id = t.participant_id)
          or (t.participant_id is null and s.participant_id is null and s.participant_nom = t.participant_nom)));
end;
$$;

revoke all on function public.fn_challenge_recalcul(uuid) from public, anon;

create or replace function public.fn_challenges_apres_commission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_ch uuid;
begin
  select p.organisation_id into v_org
    from public.devis v join public.prospects p on p.id = v.prospect_id
   where v.id = coalesce(new.reference_id, old.reference_id);
  for v_ch in
    select id from public.challenges
     where calcul_auto = 'commissions_societe' and statut <> 'termine'
       and (v_org is null or organisation_id = v_org)
  loop
    perform public.fn_challenge_recalcul(v_ch);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_challenges_apres_commission on public.commissions;
create trigger trg_challenges_apres_commission
  after insert or update of statut, montant_societe or delete on public.commissions
  for each row execute function public.fn_challenges_apres_commission();

-- Le Pari des 100 000 € passe en calcul automatique, avec Claude au classement.
update public.challenges set calcul_auto = 'commissions_societe' where id = 'd8097581-ee21-4b7b-b362-8237eb68c1a4';
insert into public.challenge_scores (challenge_id, participant_id, participant_nom, points, commentaire, updated_at)
select 'd8097581-ee21-4b7b-b362-8237eb68c1a4', null, 'Claude', 0, 'Calcul automatique : aucun devis validé', now()
 where exists (select 1 from public.challenges where id = 'd8097581-ee21-4b7b-b362-8237eb68c1a4')
   and not exists (select 1 from public.challenge_scores where challenge_id = 'd8097581-ee21-4b7b-b362-8237eb68c1a4' and participant_nom = 'Claude' and participant_id is null);
select public.fn_challenge_recalcul('d8097581-ee21-4b7b-b362-8237eb68c1a4')
 where exists (select 1 from public.challenges where id = 'd8097581-ee21-4b7b-b362-8237eb68c1a4');
