-- Cloisonnement des données par commercial : chaque commercial n'accède qu'à ses propres
-- prospects (et à tout ce qui en découle — visites, dossiers, devis, simulations, tâches,
-- documents) ; les leads non attribués restent visibles par toute l'équipe (pool commun,
-- pratique courante en CRM tant qu'un lead n'a pas de propriétaire) ; admin/manager voient
-- l'intégralité des données, comme pour l'agenda.

-- ── 1. Colonne d'attribution réelle sur prospects ───────────────────────────
-- `commercial` (text libre) existait déjà pour l'affichage mais ne permettait aucune
-- restriction d'accès fiable. On ajoute une vraie clé vers `profiles`.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS commercial_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_commercial_id ON prospects(commercial_id);

-- Rattrapage best-effort : si le nom saisi dans l'ancien champ texte correspond exactement
-- au nom complet d'un profil existant, on relie automatiquement le prospect à ce commercial.
UPDATE prospects
SET commercial_id = profiles.id
FROM profiles
WHERE prospects.commercial_id IS NULL
  AND prospects.commercial IS NOT NULL
  AND trim(prospects.commercial) <> ''
  AND lower(trim(prospects.commercial)) = lower(trim(profiles.nom_complet));

-- ── 2. Fonctions utilitaires de visibilité (réutilisent is_admin_ou_manager déjà créée) ──
CREATE OR REPLACE FUNCTION prospect_visible(p_prospect_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM prospects
    WHERE id = p_prospect_id
      AND (commercial_id = auth.uid() OR commercial_id IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION dossier_visible(p_dossier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_dossier_id IS NULL OR is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM dossiers d WHERE d.id = p_dossier_id AND prospect_visible(d.prospect_id)
  );
$$;

CREATE OR REPLACE FUNCTION devis_visible(p_devis_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_devis_id IS NULL OR is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM devis WHERE id = p_devis_id AND prospect_visible(prospect_id)
  );
$$;

-- ── 3. Policies sur prospects ────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_prospects" ON prospects;
DROP POLICY IF EXISTS "authenticated_insert_prospects" ON prospects;
DROP POLICY IF EXISTS "authenticated_update_prospects" ON prospects;
DROP POLICY IF EXISTS "authenticated_delete_prospects" ON prospects;

CREATE POLICY "prospects_select_scope" ON prospects FOR SELECT TO authenticated
  USING (commercial_id = auth.uid() OR commercial_id IS NULL OR is_admin_ou_manager());
CREATE POLICY "prospects_insert_scope" ON prospects FOR INSERT TO authenticated
  WITH CHECK (commercial_id = auth.uid() OR commercial_id IS NULL OR is_admin_ou_manager());
CREATE POLICY "prospects_update_scope" ON prospects FOR UPDATE TO authenticated
  USING (commercial_id = auth.uid() OR commercial_id IS NULL OR is_admin_ou_manager())
  WITH CHECK (commercial_id = auth.uid() OR commercial_id IS NULL OR is_admin_ou_manager());
CREATE POLICY "prospects_delete_scope" ON prospects FOR DELETE TO authenticated
  USING (commercial_id = auth.uid() OR is_admin_ou_manager());

-- ── 4. Policies sur les tables qui référencent un prospect_id ───────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['visites', 'dossiers', 'devis', 'simulations', 'interactions', 'tasks'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);

      EXECUTE format('CREATE POLICY "%s_select_scope" ON %I FOR SELECT TO authenticated USING (prospect_visible(prospect_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert_scope" ON %I FOR INSERT TO authenticated WITH CHECK (prospect_visible(prospect_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_update_scope" ON %I FOR UPDATE TO authenticated USING (prospect_visible(prospect_id)) WITH CHECK (prospect_visible(prospect_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_delete_scope" ON %I FOR DELETE TO authenticated USING (prospect_visible(prospect_id))', t, t);
    END IF;
  END LOOP;
END $$;

-- ── 5. Documents (rattachés à un dossier, lui-même rattaché à un prospect) ──
DROP POLICY IF EXISTS "authenticated_select_documents" ON documents;
DROP POLICY IF EXISTS "authenticated_insert_documents" ON documents;
DROP POLICY IF EXISTS "authenticated_update_documents" ON documents;
DROP POLICY IF EXISTS "authenticated_delete_documents" ON documents;

CREATE POLICY "documents_select_scope" ON documents FOR SELECT TO authenticated USING (dossier_visible(dossier_id));
CREATE POLICY "documents_insert_scope" ON documents FOR INSERT TO authenticated WITH CHECK (dossier_visible(dossier_id));
CREATE POLICY "documents_update_scope" ON documents FOR UPDATE TO authenticated USING (dossier_visible(dossier_id)) WITH CHECK (dossier_visible(dossier_id));
CREATE POLICY "documents_delete_scope" ON documents FOR DELETE TO authenticated USING (dossier_visible(dossier_id));

-- ── 6. Lignes et aides de devis (rattachées à un devis) ─────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['devis_lignes', 'devis_aides'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);

      EXECUTE format('CREATE POLICY "%s_select_scope" ON %I FOR SELECT TO authenticated USING (devis_visible(devis_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_insert_scope" ON %I FOR INSERT TO authenticated WITH CHECK (devis_visible(devis_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_update_scope" ON %I FOR UPDATE TO authenticated USING (devis_visible(devis_id)) WITH CHECK (devis_visible(devis_id))', t, t);
      EXECUTE format('CREATE POLICY "%s_delete_scope" ON %I FOR DELETE TO authenticated USING (devis_visible(devis_id))', t, t);
    END IF;
  END LOOP;
END $$;

-- Catalogue produits et fiche entreprise restent partagés par toute l'équipe (données
-- communes de l'entreprise, pas des données commerciales personnelles) : aucune policy
-- modifiée sur catalogue_produits / entreprises / dispositifs_aides.
