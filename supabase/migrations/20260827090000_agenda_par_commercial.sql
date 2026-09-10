-- Agenda avec accès admin (vue globale) et accès par commercial (vue restreinte à ses
-- propres événements). On ajoute la colonne d'attribution puis on remplace les policies
-- permissives de planning_events par des policies conscientes du rôle stocké dans `profiles`.

ALTER TABLE planning_events
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planning_events_user_id ON planning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_events_date ON planning_events(date);

-- Fonction utilitaire : le profil connecté est-il admin ou manager (= vue globale de l'agenda) ?
CREATE OR REPLACE FUNCTION is_admin_ou_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

DROP POLICY IF EXISTS "anon_select_planning" ON planning_events;
DROP POLICY IF EXISTS "anon_insert_planning" ON planning_events;
DROP POLICY IF EXISTS "anon_update_planning" ON planning_events;
DROP POLICY IF EXISTS "anon_delete_planning" ON planning_events;

-- Lecture : un commercial ne voit que ses propres événements (ou les événements non
-- attribués) ; admin/manager voient l'agenda complet de l'équipe.
CREATE POLICY "planning_select_scope" ON planning_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR is_admin_ou_manager());

-- Écriture : un commercial ne peut créer/modifier/supprimer que ses propres événements ;
-- admin/manager peuvent gérer l'agenda de n'importe quel commercial (réaffectation de RDV).
CREATE POLICY "planning_insert_scope" ON planning_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin_ou_manager());

CREATE POLICY "planning_update_scope" ON planning_events
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin_ou_manager())
  WITH CHECK (user_id = auth.uid() OR is_admin_ou_manager());

CREATE POLICY "planning_delete_scope" ON planning_events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin_ou_manager());

-- Accès anonyme conservé en lecture seule désactivé : l'agenda contient des données
-- personnelles de RDV clients, il ne doit être visible qu'aux comptes authentifiés.
