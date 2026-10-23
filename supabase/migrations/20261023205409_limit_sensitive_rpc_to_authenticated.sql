REVOKE ALL ON FUNCTION public.actualiser_pot_commun() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualiser_pot_commun() TO authenticated;

REVOKE ALL ON FUNCTION public.fn_commission_rule(text, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_commission_rule(text, uuid, uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION public.next_client_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_client_invoice_number() TO authenticated;

REVOKE ALL ON FUNCTION public.next_facture_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_facture_number() TO authenticated;

REVOKE ALL ON FUNCTION public.renova_set_prospect_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renova_set_prospect_status(uuid, text) TO authenticated;
