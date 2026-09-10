-- Correctif de cloisonnement (2/2) — la table `notifications` avait une policy SELECT
-- grande ouverte ("USING (true)", tous les utilisateurs authentifiés). Or les
-- notifications générées automatiquement (relance devis sans réponse, tâche en retard)
-- contiennent le nom du client et l'activité commerciale d'un prospect donné : elles
-- doivent suivre la même règle de visibilité que le prospect concerné, pas être globales.
--
-- Une notification sans prospect_id (annonce système, info générale) reste visible par
-- toute l'équipe : ce n'est pas une donnée commerciale personnelle.

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
DROP POLICY IF EXISTS "authenticated_select_notifications" ON notifications;
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "authenticated_update_notifications" ON notifications;
DROP POLICY IF EXISTS "authenticated_delete_notifications" ON notifications;

CREATE POLICY "notifications_select_scope" ON notifications FOR SELECT TO authenticated
  USING (prospect_id IS NULL OR prospect_visible(prospect_id));
CREATE POLICY "notifications_insert_scope" ON notifications FOR INSERT TO authenticated
  WITH CHECK (prospect_id IS NULL OR prospect_visible(prospect_id));
CREATE POLICY "notifications_update_scope" ON notifications FOR UPDATE TO authenticated
  USING (prospect_id IS NULL OR prospect_visible(prospect_id))
  WITH CHECK (prospect_id IS NULL OR prospect_visible(prospect_id));
CREATE POLICY "notifications_delete_scope" ON notifications FOR DELETE TO authenticated
  USING (prospect_id IS NULL OR prospect_visible(prospect_id));
