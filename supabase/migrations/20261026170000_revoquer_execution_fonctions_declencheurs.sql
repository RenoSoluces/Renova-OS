-- Déjà appliqué sur Supabase le 26/10/2026.
-- Fonctions de déclencheurs exposées par erreur en RPC : retirées aux rôles API (les déclencheurs continuent de fonctionner).
revoke execute on function public.guard_multi_org_profile_fields() from public, anon, authenticated;
revoke execute on function public.notify_manager_of_dossier_change() from public, anon, authenticated;
revoke execute on function public.notify_manager_of_prospect_change() from public, anon, authenticated;
revoke execute on function public.set_multi_org_defaults() from public, anon, authenticated;
