/* Renova OS — journal métier et garde-fous opérationnels */
CREATE TABLE IF NOT EXISTS system_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_activity_select_authenticated" ON system_activity_log;
CREATE POLICY "system_activity_select_authenticated" ON system_activity_log
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "system_activity_insert_authenticated" ON system_activity_log;
CREATE POLICY "system_activity_insert_authenticated" ON system_activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_activity_entity
  ON system_activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_activity_created
  ON system_activity_log(created_at DESC);

/* Une seule commission par objet métier : cet index existe déjà dans les versions
   précédentes, on le réaffirme ici pour les installations qui ont sauté une migration. */
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_reference
  ON commissions(reference_type, reference_id)
  WHERE reference_id IS NOT NULL;
