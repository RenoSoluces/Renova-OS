/*
# RENOVA OS — Notifications internes

Table de notifications en app, alimentée notamment par les vérifications
automatiques de relance (devis envoyés sans réponse, tâches en retard).
Une notification pointe optionnellement vers un prospect et/ou un devis pour
permettre la navigation directe depuis la cloche de notifications.

`meta` porte une clé de déduplication (ex: {"devis_id": "...", "kind": "relance_devis"})
pour éviter de renotifier plusieurs fois le même événement.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info', -- relance_devis | tache_retard | info
  titre text NOT NULL,
  message text NOT NULL DEFAULT '',
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  lue boolean NOT NULL DEFAULT false,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_notifications" ON notifications;
CREATE POLICY "authenticated_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
CREATE POLICY "authenticated_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_notifications" ON notifications;
CREATE POLICY "authenticated_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_notifications" ON notifications;
CREATE POLICY "authenticated_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_notifications_lue ON notifications(lue, created_at DESC);
