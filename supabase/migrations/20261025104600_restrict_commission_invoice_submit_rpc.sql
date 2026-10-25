REVOKE EXECUTE ON FUNCTION public.soumettre_facture_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soumettre_facture_commission(uuid) TO authenticated, service_role;
