-- Pari des 100 000 € : un pro trouvé par Claude dont le rendez-vous a été posé par un
-- participant (son appel : liste d'appels à son nom, ou un rendez-vous à son agenda) est
-- partagé 50/50 entre Claude et ce participant. Sans rendez-vous posé par un participant,
-- 100 % pour Claude. Les autres règles sont inchangées.
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
  with base as (
    select
      cm.montant_societe,
      p.commercial_id,
      (p.source ilike 'Prospection pro%' or 'Prospection pro' = any(coalesce(p.tags, '{}'))) as source_claude,
      coalesce(
        (select s.participant_id from public.challenge_scores s
          where s.challenge_id = c.id and s.participant_id = p.liste_appels_pour),
        (select pe.user_id from public.planning_events pe
           join public.challenge_scores s on s.challenge_id = c.id and s.participant_id = pe.user_id
          where pe.prospect_id = p.id
          order by pe.created_at desc limit 1)
      ) as poseur_rdv
    from public.commissions cm
    join public.devis v on v.id = cm.reference_id and cm.reference_type = 'devis'
    join public.prospects p on p.id = v.prospect_id
    where cm.type = 'devis_signe'
      and cm.statut in ('validee', 'payee')
      and p.organisation_id = c.organisation_id
      and coalesce(v.signature_date, cm.date_generation)::date between c.date_debut and c.date_fin
  ),
  lignes as (
    -- Pro trouvé par Claude : 100 % Claude, ou 50 % Claude + 50 % celui qui a posé le rendez-vous.
    select null::uuid as participant_id, 'Claude'::text as participant_nom,
           case when poseur_rdv is null then montant_societe else montant_societe / 2 end as montant
      from base where source_claude
    union all
    select poseur_rdv, null, montant_societe / 2
      from base where source_claude and poseur_rdv is not null
    union all
    -- Autres dossiers : le commercial s'il participe, sinon le créateur du challenge.
    select case when exists (select 1 from public.challenge_scores s where s.challenge_id = c.id and s.participant_id = base.commercial_id)
                then base.commercial_id else c.created_by end,
           null, montant_societe
      from base where not source_claude
  )
  select participant_id, participant_nom, round(sum(montant), 2), count(*)
  from lignes group by 1, 2;

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

select public.fn_challenge_recalcul(id) from public.challenges where calcul_auto = 'commissions_societe';
