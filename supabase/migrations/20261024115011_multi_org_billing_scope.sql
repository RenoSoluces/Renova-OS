-- Explicitly shared prospects do not automatically share another organisation's
-- billing records. Recipients may read invoices addressed to them, but only the
-- issuing organisation (or the global admin) can edit them.
DROP POLICY IF EXISTS dossier_facturation_select_scope ON public.dossier_facturation;
CREATE POLICY dossier_facturation_select_scope ON public.dossier_facturation
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR organisation_id = public.current_organisation_id()
  OR destinataire_organisation_id = public.current_organisation_id()
);

DROP POLICY IF EXISTS dossier_facturation_write_scope ON public.dossier_facturation;
CREATE POLICY dossier_facturation_write_scope ON public.dossier_facturation
FOR ALL TO authenticated
USING (
  public.is_super_admin()
  OR organisation_id = public.current_organisation_id()
)
WITH CHECK (
  public.is_super_admin()
  OR organisation_id = public.current_organisation_id()
);

DROP POLICY IF EXISTS factures_clients_select_scope ON public.factures_clients;
CREATE POLICY factures_clients_select_scope ON public.factures_clients
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR emetteur_organisation_id = public.current_organisation_id()
  OR destinataire_organisation_id = public.current_organisation_id()
);

DROP POLICY IF EXISTS factures_clients_write_scope ON public.factures_clients;
CREATE POLICY factures_clients_write_scope ON public.factures_clients
FOR ALL TO authenticated
USING (
  public.is_super_admin()
  OR emetteur_organisation_id = public.current_organisation_id()
)
WITH CHECK (
  public.is_super_admin()
  OR emetteur_organisation_id = public.current_organisation_id()
);
