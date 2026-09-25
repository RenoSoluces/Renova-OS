ALTER TABLE profiles ADD COLUMN IF NOT EXISTS objectif_mensuel numeric(12,2) DEFAULT 10000;

-- L'Admin/manager doit pouvoir définir l'objectif des commerciaux.
DROP POLICY IF EXISTS "profiles_update_objectifs_admin" ON profiles;
CREATE POLICY "profiles_update_objectifs_admin"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles me
    WHERE me.id = auth.uid()
      AND me.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles me
    WHERE me.id = auth.uid()
      AND me.role IN ('admin', 'manager')
  )
);
