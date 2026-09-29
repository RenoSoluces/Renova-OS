/* RENOVA OS V27 — cloisonnement strict + documents prospect/partenaire */

-- Un document peut être rattaché directement au prospect, notamment pour les devis partenaires.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS partenaire_id uuid REFERENCES installateurs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_prospect_id ON documents(prospect_id);
CREATE INDEX IF NOT EXISTS idx_documents_partenaire_id ON documents(partenaire_id);

-- Cloisonnement strict : un commercial voit son portefeuille et le vrai pot commun,
-- jamais les prospects attribués à un autre commercial.
CREATE OR REPLACE FUNCTION prospect_visible(p_prospect_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM prospects p
    WHERE p.id = p_prospect_id
      AND (
        p.commercial_id = auth.uid()
        OR (p.commercial_id IS NULL AND COALESCE(p.pot_commun, false) = true)
      )
  );
$$;

DROP POLICY IF EXISTS "prospects_select_scope" ON prospects;
CREATE POLICY "prospects_select_scope" ON prospects FOR SELECT TO authenticated
  USING (
    is_admin_ou_manager()
    OR commercial_id = auth.uid()
    OR (commercial_id IS NULL AND COALESCE(pot_commun, false) = true)
  );

DROP POLICY IF EXISTS "prospects_insert_scope" ON prospects;
CREATE POLICY "prospects_insert_scope" ON prospects FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_ou_manager()
    OR commercial_id = auth.uid()
    OR (commercial_id IS NULL AND COALESCE(pot_commun, false) = true)
  );

DROP POLICY IF EXISTS "prospects_update_scope" ON prospects;
CREATE POLICY "prospects_update_scope" ON prospects FOR UPDATE TO authenticated
  USING (
    is_admin_ou_manager()
    OR commercial_id = auth.uid()
    OR (commercial_id IS NULL AND COALESCE(pot_commun, false) = true)
  )
  WITH CHECK (
    is_admin_ou_manager()
    OR commercial_id = auth.uid()
    OR (commercial_id IS NULL AND COALESCE(pot_commun, false) = true)
  );

-- Les documents doivent suivre exactement la même visibilité que leur prospect/dossier.
DROP POLICY IF EXISTS "documents_select_scope" ON documents;
DROP POLICY IF EXISTS "documents_insert_scope" ON documents;
DROP POLICY IF EXISTS "documents_update_scope" ON documents;
DROP POLICY IF EXISTS "documents_delete_scope" ON documents;

CREATE POLICY "documents_select_scope" ON documents FOR SELECT TO authenticated
  USING (
    (prospect_id IS NOT NULL AND prospect_visible(prospect_id))
    OR (dossier_id IS NOT NULL AND dossier_visible(dossier_id))
    OR (prospect_id IS NULL AND dossier_id IS NULL)
  );

CREATE POLICY "documents_insert_scope" ON documents FOR INSERT TO authenticated
  WITH CHECK (
    (prospect_id IS NOT NULL AND prospect_visible(prospect_id))
    OR (dossier_id IS NOT NULL AND dossier_visible(dossier_id))
    OR (prospect_id IS NULL AND dossier_id IS NULL)
  );

CREATE POLICY "documents_update_scope" ON documents FOR UPDATE TO authenticated
  USING (
    (prospect_id IS NOT NULL AND prospect_visible(prospect_id))
    OR (dossier_id IS NOT NULL AND dossier_visible(dossier_id))
    OR (prospect_id IS NULL AND dossier_id IS NULL)
  )
  WITH CHECK (
    (prospect_id IS NOT NULL AND prospect_visible(prospect_id))
    OR (dossier_id IS NOT NULL AND dossier_visible(dossier_id))
    OR (prospect_id IS NULL AND dossier_id IS NULL)
  );

CREATE POLICY "documents_delete_scope" ON documents FOR DELETE TO authenticated
  USING (
    (prospect_id IS NOT NULL AND prospect_visible(prospect_id))
    OR (dossier_id IS NOT NULL AND dossier_visible(dossier_id))
    OR (prospect_id IS NULL AND dossier_id IS NULL)
  );


-- Le passage automatique dans le pot commun ne doit pas être annulé par le trigger
-- de reprise manuelle. La reprise manuelle reste déclenchée uniquement lorsqu'un
-- commercial renseigne un commercial_id sur un prospect déjà dans le pool.
CREATE OR REPLACE FUNCTION sortir_du_pot_commun()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.commercial_id IS NOT NULL
     AND OLD.commercial_id IS DISTINCT FROM NEW.commercial_id
     AND COALESCE(OLD.pot_commun, false) = true THEN
    NEW.pot_commun := false;
    NEW.pot_commun_at := NULL;
    NEW.pot_commun_ancien_commercial := NULL;
    NEW.derniere_interaction_at := now();
  ELSIF NEW.commercial_id IS NOT NULL
     AND OLD.commercial_id IS DISTINCT FROM NEW.commercial_id
     AND COALESCE(OLD.pot_commun, false) = false THEN
    NEW.pot_commun := false;
    NEW.pot_commun_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
