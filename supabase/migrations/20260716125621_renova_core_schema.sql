/*
# RENOVA OS - Core Schema (single-tenant, no auth)

1. New Tables
- `prospects` — A prospect (potential client): nom, prénom, téléphone, email, adresse, source, commercial, statut, commentaires.
- `habitations` — A dwelling linked to a prospect: adresse, type, année, surface, étages, chauffage, DPE, photos.
- `visites` — Technical visit linked to an habitation: date, technicien, observations, pièces, mesures, travaux conseillés, anomalies, checklist, signature.
- `simulations` — Energy renovation simulation linked to a visite: travaux proposés, montant, aides, CEE, reste à charge, rentabilité, temps de retour.
- `dossiers` — Central dossier linking prospect + habitation + visites + simulations: statut, commentaires, timeline.
- `documents` — Documents (devis, mandats, factures, photos, PDF) linked to a dossier.
- `events` — Calendar/planning events: type, titre, date début/fin, ressource, statut.
- `notifications` — In-app notifications: type, message, lue.
- `activities` — Recent activity log entries for the dashboard.
- `users` — Internal team members (commerciaux, techniciens, assistantes): nom, rôle, email, avatar initiales.

2. Security
- Single-tenant app (no sign-in screen requested). RLS enabled on every table.
- All policies scoped `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared across the team.
*/

CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  email text,
  adresse text,
  source text DEFAULT 'Site web',
  commercial text,
  statut text NOT NULL DEFAULT 'Nouveau',
  commentaires text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  adresse text NOT NULL,
  type text DEFAULT 'Maison',
  annee_construction int,
  surface int,
  nombre_etages int DEFAULT 1,
  mode_chauffage text,
  dpe text DEFAULT 'Non renseigné',
  photos text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habitation_id uuid NOT NULL REFERENCES habitations(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  technicien text,
  observations text,
  pieces jsonb DEFAULT '[]'::jsonb,
  mesures jsonb DEFAULT '[]'::jsonb,
  travaux_conseilles jsonb DEFAULT '[]'::jsonb,
  anomalies jsonb DEFAULT '[]'::jsonb,
  checklist jsonb DEFAULT '[]'::jsonb,
  signature text,
  statut text NOT NULL DEFAULT 'Planifiée',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visite_id uuid REFERENCES visites(id) ON DELETE SET NULL,
  habitation_id uuid NOT NULL REFERENCES habitations(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  travaux_proposes jsonb DEFAULT '[]'::jsonb,
  montant_total numeric(12,2) DEFAULT 0,
  montant_aides numeric(12,2) DEFAULT 0,
  montant_cee numeric(12,2) DEFAULT 0,
  reste_a_charge numeric(12,2) DEFAULT 0,
  rentabilite numeric(5,2) DEFAULT 0,
  temps_retour numeric(5,2) DEFAULT 0,
  pdf_url text,
  statut text NOT NULL DEFAULT 'Brouillon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  habitation_id uuid REFERENCES habitations(id) ON DELETE SET NULL,
  reference text NOT NULL DEFAULT ('DOS-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))),
  statut text NOT NULL DEFAULT 'Prospect',
  commentaires text,
  ca_potentiel numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid REFERENCES dossiers(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text NOT NULL DEFAULT 'Autre',
  taille text,
  url text,
  categorie text DEFAULT 'Général',
  signe boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  type text NOT NULL DEFAULT 'Visite',
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  ressource text,
  statut text NOT NULL DEFAULT 'Planifié',
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  lue boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  description text NOT NULL,
  auteur text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  role text NOT NULL DEFAULT 'Commercial',
  email text,
  initiales text,
  couleur text DEFAULT '#3D8B7A',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE habitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Prospects
DROP POLICY IF EXISTS "anon_select_prospects" ON prospects;
CREATE POLICY "anon_select_prospects" ON prospects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_prospects" ON prospects;
CREATE POLICY "anon_insert_prospects" ON prospects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_prospects" ON prospects;
CREATE POLICY "anon_update_prospects" ON prospects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_prospects" ON prospects;
CREATE POLICY "anon_delete_prospects" ON prospects FOR DELETE TO anon, authenticated USING (true);

-- Habitations
DROP POLICY IF EXISTS "anon_select_habitations" ON habitations;
CREATE POLICY "anon_select_habitations" ON habitations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_habitations" ON habitations;
CREATE POLICY "anon_insert_habitations" ON habitations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_habitations" ON habitations;
CREATE POLICY "anon_update_habitations" ON habitations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_habitations" ON habitations;
CREATE POLICY "anon_delete_habitations" ON habitations FOR DELETE TO anon, authenticated USING (true);

-- Visites
DROP POLICY IF EXISTS "anon_select_visites" ON visites;
CREATE POLICY "anon_select_visites" ON visites FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_visites" ON visites;
CREATE POLICY "anon_insert_visites" ON visites FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_visites" ON visites;
CREATE POLICY "anon_update_visites" ON visites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_visites" ON visites;
CREATE POLICY "anon_delete_visites" ON visites FOR DELETE TO anon, authenticated USING (true);

-- Simulations
DROP POLICY IF EXISTS "anon_select_simulations" ON simulations;
CREATE POLICY "anon_select_simulations" ON simulations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_simulations" ON simulations;
CREATE POLICY "anon_insert_simulations" ON simulations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_simulations" ON simulations;
CREATE POLICY "anon_update_simulations" ON simulations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_simulations" ON simulations;
CREATE POLICY "anon_delete_simulations" ON simulations FOR DELETE TO anon, authenticated USING (true);

-- Dossiers
DROP POLICY IF EXISTS "anon_select_dossiers" ON dossiers;
CREATE POLICY "anon_select_dossiers" ON dossiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dossiers" ON dossiers;
CREATE POLICY "anon_insert_dossiers" ON dossiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dossiers" ON dossiers;
CREATE POLICY "anon_update_dossiers" ON dossiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dossiers" ON dossiers;
CREATE POLICY "anon_delete_dossiers" ON dossiers FOR DELETE TO anon, authenticated USING (true);

-- Documents
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);

-- Events
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE TO anon, authenticated USING (true);

-- Notifications
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- Activities
DROP POLICY IF EXISTS "anon_select_activities" ON activities;
CREATE POLICY "anon_select_activities" ON activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
CREATE POLICY "anon_insert_activities" ON activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activities" ON activities;
CREATE POLICY "anon_delete_activities" ON activities FOR DELETE TO anon, authenticated USING (true);

-- Users
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_habitations_prospect ON habitations(prospect_id);
CREATE INDEX IF NOT EXISTS idx_visites_habitation ON visites(habitation_id);
CREATE INDEX IF NOT EXISTS idx_visites_prospect ON visites(prospect_id);
CREATE INDEX IF NOT EXISTS idx_simulations_prospect ON simulations(prospect_id);
CREATE INDEX IF NOT EXISTS idx_simulations_habitation ON simulations(habitation_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_prospect ON dossiers(prospect_id);
CREATE INDEX IF NOT EXISTS idx_documents_dossier ON documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_debut);
CREATE INDEX IF NOT EXISTS idx_notifications_lue ON notifications(lue);
