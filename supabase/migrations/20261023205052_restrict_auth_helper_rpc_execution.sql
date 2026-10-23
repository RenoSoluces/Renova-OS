REVOKE ALL ON FUNCTION public.prospect_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospect_visible(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.devis_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.devis_visible(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.dossier_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_visible(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_ou_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_ou_manager() TO authenticated;
