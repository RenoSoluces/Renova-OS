/* Dashboard Admin + chat prospect + suivi de facturation */
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS installateur_id uuid REFERENCES installateurs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_installateur ON prospects(installateur_id);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS facturee_at timestamptz, ADD COLUMN IF NOT EXISTS facture_numero text;
CREATE INDEX IF NOT EXISTS idx_commissions_facturation ON commissions(facturee_at, date_paiement_societe);
CREATE TABLE IF NOT EXISTS prospect_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  contenu text NOT NULL, lu boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE prospect_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prospect_messages_select ON prospect_messages;
CREATE POLICY prospect_messages_select ON prospect_messages FOR SELECT TO authenticated USING (sender_id=auth.uid() OR recipient_id=auth.uid() OR is_admin_ou_manager() OR EXISTS (SELECT 1 FROM prospects p WHERE p.id=prospect_messages.prospect_id AND p.commercial_id=auth.uid()));
DROP POLICY IF EXISTS prospect_messages_insert ON prospect_messages;
CREATE POLICY prospect_messages_insert ON prospect_messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND (is_admin_ou_manager() OR EXISTS (SELECT 1 FROM prospects p WHERE p.id=prospect_messages.prospect_id AND p.commercial_id=auth.uid())));
DROP POLICY IF EXISTS prospect_messages_update ON prospect_messages;
CREATE POLICY prospect_messages_update ON prospect_messages FOR UPDATE TO authenticated USING (recipient_id=auth.uid() OR is_admin_ou_manager()) WITH CHECK (recipient_id=auth.uid() OR is_admin_ou_manager());
CREATE INDEX IF NOT EXISTS idx_prospect_messages_prospect ON prospect_messages(prospect_id,created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_messages_recipient ON prospect_messages(recipient_id,lu,created_at DESC);
