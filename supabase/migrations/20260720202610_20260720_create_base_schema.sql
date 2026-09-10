/*
# RENOVA OS — Base schema

1. New Tables
- prospects: CRM contacts for energy renovation leads
- visites: Technical audit visits linked to prospects, with audit_data jsonb
- simulations: 3CL energy calculations
- dossiers: Administrative files tracking renovation projects
- planning_events: Calendar events for visits and meetings
- documents: Generated/stored documents linked to dossiers

2. Security
- Single-tenant (no auth) — all policies use TO anon, authenticated
- RLS enabled on every table
- All data is intentionally shared within the organization
*/

CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL DEFAULT '',
  email text DEFAULT '',
  telephone text DEFAULT '',
  adresse text DEFAULT '',
  code_postal text DEFAULT '',
  ville text DEFAULT '',
  source text DEFAULT 'site_web',
  statut text NOT NULL DEFAULT 'nouveau',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_prospects" ON prospects;
CREATE POLICY "anon_select_prospects" ON prospects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_prospects" ON prospects;
CREATE POLICY "anon_insert_prospects" ON prospects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_prospects" ON prospects;
CREATE POLICY "anon_update_prospects" ON prospects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_prospects" ON prospects;
CREATE POLICY "anon_delete_prospects" ON prospects FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS visites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  date_visite date,
  statut text NOT NULL DEFAULT 'planifiee',
  audit_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_visites" ON visites;
CREATE POLICY "anon_select_visites" ON visites FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_visites" ON visites;
CREATE POLICY "anon_insert_visites" ON visites FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_visites" ON visites;
CREATE POLICY "anon_update_visites" ON visites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_visites" ON visites;
CREATE POLICY "anon_delete_visites" ON visites FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  visite_id uuid REFERENCES visites(id) ON DELETE SET NULL,
  nom text NOT NULL DEFAULT 'Simulation',
  config_avant jsonb DEFAULT '{}',
  config_apres jsonb DEFAULT '{}',
  resultat_avant jsonb DEFAULT '{}',
  resultat_apres jsonb DEFAULT '{}',
  aides jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_simulations" ON simulations;
CREATE POLICY "anon_select_simulations" ON simulations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_simulations" ON simulations;
CREATE POLICY "anon_insert_simulations" ON simulations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_simulations" ON simulations;
CREATE POLICY "anon_update_simulations" ON simulations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_simulations" ON simulations;
CREATE POLICY "anon_delete_simulations" ON simulations FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  visite_id uuid REFERENCES visites(id) ON DELETE SET NULL,
  reference text UNIQUE NOT NULL,
  statut text NOT NULL DEFAULT 'creation',
  montant_total numeric DEFAULT 0,
  aides_montant numeric DEFAULT 0,
  reste_a_charge numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dossiers" ON dossiers;
CREATE POLICY "anon_select_dossiers" ON dossiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dossiers" ON dossiers;
CREATE POLICY "anon_insert_dossiers" ON dossiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dossiers" ON dossiers;
CREATE POLICY "anon_update_dossiers" ON dossiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dossiers" ON dossiers;
CREATE POLICY "anon_delete_dossiers" ON dossiers FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS planning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  date date NOT NULL,
  heure text DEFAULT '09:00',
  type text NOT NULL DEFAULT 'visite',
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  adresse text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE planning_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_planning" ON planning_events;
CREATE POLICY "anon_select_planning" ON planning_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_planning" ON planning_events;
CREATE POLICY "anon_insert_planning" ON planning_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_planning" ON planning_events;
CREATE POLICY "anon_update_planning" ON planning_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_planning" ON planning_events;
CREATE POLICY "anon_delete_planning" ON planning_events FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid REFERENCES dossiers(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text NOT NULL DEFAULT 'autre',
  taille integer DEFAULT 0,
  url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);
