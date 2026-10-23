-- Remove permissive legacy policies that bypass prospect/dossier scoping.
DROP POLICY IF EXISTS authenticated_select_documents ON public.documents;
DROP POLICY IF EXISTS authenticated_insert_documents ON public.documents;
DROP POLICY IF EXISTS authenticated_update_documents ON public.documents;
DROP POLICY IF EXISTS authenticated_delete_documents ON public.documents;

DROP POLICY IF EXISTS documents_select_scope ON public.documents;
CREATE POLICY documents_select_scope ON public.documents
FOR SELECT TO authenticated
USING (
  (prospect_id IS NOT NULL AND public.prospect_visible(prospect_id))
  OR (dossier_id IS NOT NULL AND public.dossier_visible(dossier_id))
  OR (prospect_id IS NULL AND dossier_id IS NULL AND public.is_admin_ou_manager())
);
DROP POLICY IF EXISTS documents_insert_scope ON public.documents;
CREATE POLICY documents_insert_scope ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  (prospect_id IS NOT NULL AND public.prospect_visible(prospect_id))
  OR (dossier_id IS NOT NULL AND public.dossier_visible(dossier_id))
  OR (prospect_id IS NULL AND dossier_id IS NULL AND public.is_admin_ou_manager())
);
DROP POLICY IF EXISTS documents_update_scope ON public.documents;
CREATE POLICY documents_update_scope ON public.documents
FOR UPDATE TO authenticated
USING (
  (prospect_id IS NOT NULL AND public.prospect_visible(prospect_id))
  OR (dossier_id IS NOT NULL AND public.dossier_visible(dossier_id))
  OR (prospect_id IS NULL AND dossier_id IS NULL AND public.is_admin_ou_manager())
)
WITH CHECK (
  (prospect_id IS NOT NULL AND public.prospect_visible(prospect_id))
  OR (dossier_id IS NOT NULL AND public.dossier_visible(dossier_id))
  OR (prospect_id IS NULL AND dossier_id IS NULL AND public.is_admin_ou_manager())
);
DROP POLICY IF EXISTS documents_delete_scope ON public.documents;
CREATE POLICY documents_delete_scope ON public.documents
FOR DELETE TO authenticated
USING (
  (prospect_id IS NOT NULL AND public.prospect_visible(prospect_id))
  OR (dossier_id IS NOT NULL AND public.dossier_visible(dossier_id))
  OR (prospect_id IS NULL AND dossier_id IS NULL AND public.is_admin_ou_manager())
);

-- Catalogue is readable by authenticated users, but only administration can change it.
DROP POLICY IF EXISTS authenticated_insert_catalogue_produits ON public.catalogue_produits;
DROP POLICY IF EXISTS authenticated_update_catalogue_produits ON public.catalogue_produits;
DROP POLICY IF EXISTS authenticated_delete_catalogue_produits ON public.catalogue_produits;
CREATE POLICY catalogue_produits_admin_write ON public.catalogue_produits
FOR ALL TO authenticated
USING (public.is_admin_ou_manager())
WITH CHECK (public.is_admin_ou_manager());

-- Prevent authenticated users from reading the partner purchase-price column through PostgREST.
REVOKE SELECT ON TABLE public.catalogue_produits FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, entreprise_id, categorie, nom, marque, reference, description, caracteristiques,
  prix_unitaire_ht, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee, actif,
  created_at, zones_prix, forfait_pose_ht, forfait_evacuation_ht, public_cible,
  catalogue_groupe, forfait_consommables_ht
) ON TABLE public.catalogue_produits TO authenticated;

-- Assistance programmes: public data is readable, editing is administration-only.
DROP POLICY IF EXISTS authenticated_select_dispositifs_aides ON public.dispositifs_aides;
DROP POLICY IF EXISTS authenticated_insert_dispositifs_aides ON public.dispositifs_aides;
DROP POLICY IF EXISTS authenticated_update_dispositifs_aides ON public.dispositifs_aides;
DROP POLICY IF EXISTS authenticated_delete_dispositifs_aides ON public.dispositifs_aides;
CREATE POLICY dispositifs_aides_read ON public.dispositifs_aides
FOR SELECT TO authenticated USING (true);
CREATE POLICY dispositifs_aides_admin_write ON public.dispositifs_aides
FOR ALL TO authenticated
USING (public.is_admin_ou_manager())
WITH CHECK (public.is_admin_ou_manager());

-- Former commercial contact details and internal commission schedules are admin-only.
DROP POLICY IF EXISTS commerciaux_historique_select ON public.commerciaux_historique;
CREATE POLICY commerciaux_historique_select_admin ON public.commerciaux_historique
FOR SELECT TO authenticated USING (public.is_admin_ou_manager());
DROP POLICY IF EXISTS commission_bareme_select_all ON public.commission_bareme;
CREATE POLICY commission_bareme_select_admin ON public.commission_bareme
FOR SELECT TO authenticated USING (public.is_admin_ou_manager());

-- Company settings contain banking details and financial assumptions: only administration can mutate them.
DROP POLICY IF EXISTS authenticated_select_entreprises ON public.entreprises;
DROP POLICY IF EXISTS authenticated_insert_entreprises ON public.entreprises;
DROP POLICY IF EXISTS authenticated_update_entreprises ON public.entreprises;
DROP POLICY IF EXISTS authenticated_delete_entreprises ON public.entreprises;
CREATE POLICY entreprises_select_authenticated ON public.entreprises
FOR SELECT TO authenticated USING (true);
CREATE POLICY entreprises_admin_write ON public.entreprises
FOR ALL TO authenticated
USING (public.is_admin_ou_manager())
WITH CHECK (public.is_admin_ou_manager());

-- Only administration can read or alter the aide synchronization log.
DROP POLICY IF EXISTS authenticated_select_sync_log ON public.dispositifs_sync_log;
DROP POLICY IF EXISTS authenticated_insert_sync_log ON public.dispositifs_sync_log;
CREATE POLICY dispositifs_sync_log_admin_read ON public.dispositifs_sync_log
FOR SELECT TO authenticated USING (public.is_admin_ou_manager());
CREATE POLICY dispositifs_sync_log_admin_insert ON public.dispositifs_sync_log
FOR INSERT TO authenticated WITH CHECK (public.is_admin_ou_manager());

-- SAV records follow the visibility of their dossier's prospect.
DROP POLICY IF EXISTS sav_select ON public.sav_interventions;
CREATE POLICY sav_select_scope ON public.sav_interventions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = sav_interventions.dossier_id
      AND public.prospect_visible(d.prospect_id)
  )
);
DROP POLICY IF EXISTS sav_write ON public.sav_interventions;
CREATE POLICY sav_write_scope ON public.sav_interventions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = sav_interventions.dossier_id
      AND public.prospect_visible(d.prospect_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = sav_interventions.dossier_id
      AND public.prospect_visible(d.prospect_id)
  )
);
