REVOKE EXECUTE ON FUNCTION public.fn_commission_product_variant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_commission_product_variant(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.notify_prospect_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_prospect_message() TO service_role;
