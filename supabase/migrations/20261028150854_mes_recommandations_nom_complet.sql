CREATE OR REPLACE FUNCTION public.mes_recommandations()
 RETURNS TABLE(id uuid, client text, ville text, statut text, etape text, cree_le timestamp with time zone, derniere_activite timestamp with time zone, montant_signe_ht numeric, commission numeric, commission_statut text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,
         trim(concat_ws(' ', p.prenom, p.nom)),
         p.ville, p.statut,
         case
           when lower(p.statut) in ('installé', 'installe') then 'Installé'
           when lower(p.statut) in ('installation', 'signé', 'signe') then 'Signé'
           when exists (select 1 from public.devis d where d.prospect_id = p.id and d.statut = 'envoye') then 'Devis envoyé'
           when exists (select 1 from public.visites v where v.prospect_id = p.id) then 'Visite technique'
           when lower(p.statut) in ('perdu', 'refusé', 'refuse') then 'Sans suite'
           when exists (select 1 from public.interactions i where i.prospect_id = p.id and coalesce(i.meta->>'canal', '') <> 'apporteur') then 'Contacté'
           else 'Reçu'
         end,
         p.created_at, coalesce(p.derniere_interaction_at, p.updated_at),
         (select sum(d.montant_ht) from public.devis d where d.prospect_id = p.id and d.statut = 'signe'),
         (select sum(c.montant_commercial) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type = 'devis' and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id)),
         (select max(c.statut) from public.commissions c where c.commercial_id = (select auth.uid()) and c.statut <> 'annulee'
            and ((c.reference_type = 'devis' and c.reference_id in (select d.id from public.devis d where d.prospect_id = p.id)) or c.reference_id = p.id))
    from public.prospects p
   where p.apporteur_user_id = (select auth.uid())
   order by p.created_at desc
   limit 300;
$function$;
