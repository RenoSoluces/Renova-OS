/*
# Suppression des prospects réservée aux admins/managers

Jusqu'ici un commercial pouvait supprimer les prospects qui lui étaient attribués
(policy `prospects_delete_scope` : `commercial_id = auth.uid() OR is_admin_ou_manager()`).
Un commercial doit pouvoir créer et modifier ses prospects, mais seule l'administration
doit pouvoir les supprimer définitivement (traçabilité, évite la perte accidentelle de
leads travaillés).
*/

DROP POLICY IF EXISTS "prospects_delete_scope" ON prospects;
CREATE POLICY "prospects_delete_scope" ON prospects
  FOR DELETE TO authenticated USING (is_admin_ou_manager());
