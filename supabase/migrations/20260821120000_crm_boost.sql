/*
# RENOVA OS — CRM Boost

## Résumé
Transforme la fiche prospect statique en un CRM complet : historique
d'interactions (appels, emails, notes, RDV...), tâches & relances,
valorisation du pipeline commercial et affectation à un commercial.

## 1. Colonnes ajoutées à `prospects`
- `commercial` text — nom du commercial en charge du prospect
- `tags` text[] — étiquettes libres (ex: "urgent", "isolation", "1€")
- `montant_potentiel` numeric — estimation du CA potentiel (visible en pipeline)
- `temperature` text — "chaud" / "tiede" / "froid", qualifie l'intention d'achat
- `derniere_interaction_at` timestamptz — mise à jour automatique à chaque interaction

## 2. Nouvelles tables
- `interactions` — journal chronologique de tout ce qui se passe avec un
  prospect : appel, email, sms, rdv, note, changement de statut, visite,
  devis envoyé/signé...
- `tasks` — tâches et relances : appeler le client, envoyer un document,
  relancer après un devis, etc. Avec échéance, priorité et statut fait/à faire.

## 3. Sécurité
Application mono-tenant sans écran de connexion (cohérent avec le reste du
schéma) : RLS activée, policies ouvertes à `anon, authenticated`.
*/

-- ── 1. Enrichissement de prospects ────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='commercial') THEN
    ALTER TABLE prospects ADD COLUMN commercial text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='tags') THEN
    ALTER TABLE prospects ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='montant_potentiel') THEN
    ALTER TABLE prospects ADD COLUMN montant_potentiel numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='temperature') THEN
    ALTER TABLE prospects ADD COLUMN temperature text DEFAULT 'tiede';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='derniere_interaction_at') THEN
    ALTER TABLE prospects ADD COLUMN derniere_interaction_at timestamptz;
  END IF;
END $$;

-- ── 2. Interactions (timeline) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note', -- appel | email | sms | rdv | note | statut | visite | devis | dossier
  contenu text NOT NULL DEFAULT '',
  auteur text DEFAULT '',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_interactions" ON interactions;
CREATE POLICY "anon_select_interactions" ON interactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_interactions" ON interactions;
CREATE POLICY "anon_insert_interactions" ON interactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_interactions" ON interactions;
CREATE POLICY "anon_update_interactions" ON interactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_interactions" ON interactions;
CREATE POLICY "anon_delete_interactions" ON interactions FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_interactions_prospect ON interactions(prospect_id, created_at DESC);

-- ── 3. Tasks (tâches & relances) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'relance', -- appel | relance | rdv | email | autre
  priorite text NOT NULL DEFAULT 'normale', -- basse | normale | haute
  assigne text DEFAULT '',
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tasks_prospect ON tasks(prospect_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(done, due_at);
