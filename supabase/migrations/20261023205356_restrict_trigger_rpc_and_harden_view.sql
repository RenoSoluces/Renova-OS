REVOKE ALL ON FUNCTION public.fn_attribuer_numero_devis_sequentiel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_audit_dossiers() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_create_commission_vt_on_validation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_delete_commission_devis() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_dossier_installation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_guard_vt_commission_product() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_vt_terminee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_commission_devis_signe() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_commission_echeance_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_commission_vt_qualification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sync_commission_vt_validation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_new_prospect() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_commercial_dossier_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renova_log_row_change() FROM PUBLIC, anon, authenticated;

ALTER VIEW public.renova_system_health SET (security_invoker = true);
ALTER FUNCTION public.fn_guard_vt_produit_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.sortir_du_pot_commun() SET search_path = public, pg_temp;
