-- Chat du dossier : l'apporteur (ou la personne qui a fourni le prospect) fait partie de la conversation.
-- Les personnes qui voient le prospect peuvent donc lire son nom pour l'afficher dans le chat.
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
                    and (p.apporteur_user_id = (select auth.uid()) or p.liste_appels_pour = (select auth.uid())))
      or exists (select 1 from public.prospects p
                  where (p.apporteur_user_id = p_profile_id or p.liste_appels_pour = p_profile_id)
                    and public.prospect_visible(p.id));
$$;
revoke all on function public.profil_interlocuteur(uuid) from public, anon;
grant execute on function public.profil_interlocuteur(uuid) to authenticated;
