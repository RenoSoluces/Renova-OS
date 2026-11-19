-- Le call / l'apporteur suit les prospects qu'il a apportés : il voit la fiche, le chat du
-- dossier, l'historique des échanges et les rappels, et peut y ajouter (appel, note, message,
-- rappel). Il ne voit ni les devis, ni les dossiers, ni les documents, et ne modifie pas la fiche.

-- Accès « suivi » : prospect apporté par moi, ou confié à moi en prospection téléphonique.
create or replace function public.prospect_acces_suivi(p_prospect_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.prospects p
                  where p.id = p_prospect_id
                    and (p.apporteur_user_id = (select auth.uid())
                         or (p.liste_appels_pour = (select auth.uid()) and p.organisation_id = public.current_organisation_id())));
$$;
revoke all on function public.prospect_acces_suivi(uuid) from public, anon;
grant execute on function public.prospect_acces_suivi(uuid) to authenticated;

-- La liste d'appels reste couverte (même définition qu'avant, élargie aux prospects apportés).
create or replace function public.prospect_en_liste_appels(p_prospect_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.prospect_acces_suivi(p_prospect_id);
$$;

create or replace function public.prospect_row_visible(p_id uuid, p_commercial_id uuid, p_organisation_id uuid, p_pot_commun boolean)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.is_super_admin()
    or (
      p_organisation_id = public.current_organisation_id()
      and (
        p_commercial_id = (select auth.uid())
        or exists (select 1 from public.profiles owner_profile
                   where owner_profile.id = p_commercial_id and owner_profile.manager_id = (select auth.uid()))
        or exists (select 1 from public.profiles me
                   where me.id = (select auth.uid()) and me.role in ('partner_admin', 'company_admin'))
        or exists (select 1 from public.prospects l
                   where l.id = p_id and l.liste_appels_pour = (select auth.uid()))
      )
    )
    or exists (select 1 from public.prospects a where a.id = p_id and a.apporteur_user_id = (select auth.uid()))
    or (
      p_commercial_id is null and coalesce(p_pot_commun, false)
      and exists (select 1 from public.organisations o
                  where o.id = public.current_organisation_id() and o.type = 'interne')
    )
    or exists (select 1 from public.prospect_shares s
               where s.prospect_id = p_id and s.organisation_id = public.current_organisation_id());
$$;

-- Chat du dossier : lecture et envoi pour la personne qui suit le prospect.
alter policy prospect_messages_select_scope on public.prospect_messages
  using (public.prospect_visible(prospect_id) or public.prospect_acces_suivi(prospect_id));
alter policy prospect_messages_insert_scope on public.prospect_messages
  with check (sender_id = (select auth.uid()) and (public.prospect_visible(prospect_id) or public.prospect_acces_suivi(prospect_id)));

-- Interlocuteurs visibles (nom affiché dans le chat, destinataire des messages) :
-- les responsables de son entreprise, le commercial des prospects que l'on suit et
-- les personnes qui ont écrit sur ces prospects.
create or replace function public.profil_interlocuteur(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles t
                  where t.id = p_profile_id
                    and t.organisation_id = public.current_organisation_id()
                    and t.role in ('admin', 'manager', 'commercial_manager'))
      or exists (select 1 from public.prospects p
                  where p.commercial_id = p_profile_id
                    and (p.apporteur_user_id = (select auth.uid()) or p.liste_appels_pour = (select auth.uid())))
      or exists (select 1 from public.prospect_messages m
                   join public.prospects p on p.id = m.prospect_id
                  where m.sender_id = p_profile_id
                    and (p.apporteur_user_id = (select auth.uid()) or p.liste_appels_pour = (select auth.uid())));
$$;
revoke all on function public.profil_interlocuteur(uuid) from public, anon;
grant execute on function public.profil_interlocuteur(uuid) to authenticated;

drop policy if exists profiles_select_interlocuteurs on public.profiles;
create policy profiles_select_interlocuteurs on public.profiles for select to authenticated
  using (public.profil_interlocuteur(id));

-- Notifications du chat (déjà envoyées côté serveur au destinataire et au commercial) :
-- l'apporteur du prospect est aussi prévenu, sauf s'il est l'auteur ou déjà prévenu.
CREATE OR REPLACE FUNCTION public.notify_prospect_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prospect_row record;
  sender_name text;
  recipient_user uuid;
BEGIN
  SELECT id, prenom, nom, commercial_id, apporteur_user_id
    INTO prospect_row
    FROM public.prospects
   WHERE id = NEW.prospect_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(nom_complet, ''), email, 'Un utilisateur')
    INTO sender_name
    FROM public.profiles
   WHERE id = NEW.sender_id;

  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications(type, titre, message, prospect_id, recipient_id, meta)
    VALUES (
      'message_prospect',
      'Nouveau message dans une conversation',
      coalesce(sender_name, 'Un utilisateur') || ' vous a envoyé un message concernant ' ||
        trim(coalesce(prospect_row.prenom, '') || ' ' || coalesce(prospect_row.nom, '')) || '.',
      NEW.prospect_id,
      NEW.recipient_id,
      jsonb_build_object('kind', 'message_prospect', 'message_id', NEW.id)
    );
  END IF;

  recipient_user := prospect_row.commercial_id;
  IF recipient_user IS NOT NULL
     AND recipient_user <> NEW.sender_id
     AND recipient_user IS DISTINCT FROM NEW.recipient_id THEN
    INSERT INTO public.notifications(type, titre, message, prospect_id, recipient_id, meta)
    VALUES (
      'message_prospect',
      'Nouveau message sur un prospect attribué',
      coalesce(sender_name, 'Un utilisateur') || ' a envoyé un message concernant ' ||
        trim(coalesce(prospect_row.prenom, '') || ' ' || coalesce(prospect_row.nom, '')) || '.',
      NEW.prospect_id,
      recipient_user,
      jsonb_build_object('kind', 'message_prospect', 'message_id', NEW.id)
    );
  END IF;

  recipient_user := prospect_row.apporteur_user_id;
  IF recipient_user IS NOT NULL
     AND recipient_user <> NEW.sender_id
     AND recipient_user IS DISTINCT FROM NEW.recipient_id
     AND recipient_user IS DISTINCT FROM prospect_row.commercial_id THEN
    INSERT INTO public.notifications(type, titre, message, prospect_id, recipient_id, meta)
    VALUES (
      'message_prospect',
      'Nouveau message sur un prospect que vous avez apporté',
      coalesce(sender_name, 'Un utilisateur') || ' a écrit au sujet de ' ||
        trim(coalesce(prospect_row.prenom, '') || ' ' || coalesce(prospect_row.nom, '')) || '.',
      NEW.prospect_id,
      recipient_user,
      jsonb_build_object('kind', 'message_prospect', 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Tableau de bord de l'apporteur : nom complet du client (il a accès à la fiche).
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
