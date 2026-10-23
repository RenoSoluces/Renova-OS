REVOKE EXECUTE ON FUNCTION public.actualiser_pot_commun() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.actualiser_pot_commun() TO service_role;
REVOKE EXECUTE ON FUNCTION public.fn_commission_rule(text, uuid, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_commission_rule(text, uuid, uuid, date) TO service_role;
