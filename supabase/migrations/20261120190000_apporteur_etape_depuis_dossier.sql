-- Espace apporteur : l'avancement suit aussi le parcours du dossier (et les devis signés),
-- pas seulement le statut de la fiche prospect, qui n'est pas toujours mis à jour.
create or replace function public.mes_recommandations()
 returns table(id uuid, client text, ville text, statut text, etape text, cree_le timestamptz, derniere_activite timestamptz, montant_signe_ht numeric, commission numeric, commission_statut text)
 language sql stable security definer set search_path to 'public'
as $function$
  select p.id,
         trim(concat_ws(' ', p.prenom, p.nom)),
         p.ville, p.statut,
         case
           when lower(p.statut) in ('installé', 'installe')
             or dos.parcours_etape in ('cofrac2', 'dossier_cee', 'aff_cee', 'cee_paye')
             or (dos.parcours_etape = 'installation' and dos.parcours_statut = 'Terminée') then 'Installé'
           when dos.parcours_etape = 'annule' then 'Sans suite'
           when lower(p.statut) in ('installation', 'signé', 'signe')
             or dos.parcours_etape in ('cofrac1', 'installation')
             or (dos.parcours_etape = 'devis' and dos.parcours_statut in ('Signé', 'Signé en électronique'))
             or exists (select 1 from public.devis d where d.prospect_id = p.id and d.statut = 'signe') then 'Signé'
           when (dos.parcours_etape = 'devis' and dos.parcours_statut = 'Refus') then 'Sans suite'
           when dos.parcours_etape = 'devis' and dos.parcours_statut in ('Envoyé', 'En attente de signature')
             or exists (select 1 from public.devis d where d.prospect_id = p.id and d.statut = 'envoye') then 'Devis envoyé'
           when dos.parcours_etape in ('audit', 'devis')
             or (dos.parcours_etape = 'rdv' and dos.parcours_statut = 'Effectué')
             or exists (select 1 from public.visites v where v.prospect_id = p.id) then 'Visite technique'
           when lower(p.statut) in ('perdu', 'refusé', 'refuse') then 'Sans suite'
           when dos.parcours_etape = 'rdv'
             or exists (select 1 from public.interactions i where i.prospect_id = p.id and coalesce(i.meta->>'canal', '') <> 'apporteur') then 'Contacté'
           else 'Reçu'
         end,
         p.created_at, coalesce(p.derniere_interaction_at, p.updated_at),
         (select sum(d.montant_ht) from public.devis d where d.prospect_id = p.id and d.statut = 'signe'),
         (select sum(c.montant_commercial) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type in ('devis', 'devis_apporteur') and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id)),
         (select max(c.statut) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type in ('devis', 'devis_apporteur') and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id))
    from public.prospects p
    left join lateral (select d.parcours_etape, d.parcours_statut from public.dossiers d where d.prospect_id = p.id order by d.created_at desc limit 1) dos on true
   where p.apporteur_user_id = (select auth.uid())
   order by p.created_at desc
   limit 300;
$function$;
