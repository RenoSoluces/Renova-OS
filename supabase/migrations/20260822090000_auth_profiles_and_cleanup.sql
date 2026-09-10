/*
# RENOVA OS — Authentification, nettoyage du schéma & audit de signature

## 1. Authentification multi-commerciaux
Ajoute une vraie authentification (Supabase Auth) avec une table `profiles`
liée à `auth.users`. Un profil est créé automatiquement à l'inscription
(trigger `handle_new_user`). Tous les commerciaux authentifiés peuvent
voir les profils de l'équipe (nécessaire pour l'affectation des prospects),
mais ne peuvent modifier que le leur.

## 2. Durcissement des accès (RLS)
Toutes les tables métier passent d'un accès ouvert `anon` à un accès
réservé aux utilisateurs authentifiés (`authenticated`). L'équipe voit
l'ensemble des prospects/dossiers (fonctionnement CRM d'équipe classique
pour une PME), mais l'accès nécessite désormais un compte.

⚠️ Après cette migration, il faut créer au moins un compte utilisateur
(page de connexion de l'application) pour continuer à utiliser le logiciel.

## 3. Nettoyage du schéma
Suppression des tables `habitations`, `events`, `notifications`,
`activities`, `users` issues d'une première itération du schéma
(2026-07-16) et jamais utilisées par l'application (remplacées par
`visites`, `planning_events`, `interactions`/`tasks`, `profiles`).

## 4. Audit de signature
Ajoute une colonne `signature_audit` (jsonb) sur `devis` pour tracer
l'user-agent, l'empreinte du document signé et l'utilisateur connecté au
moment de la signature manuscrite — renforce la valeur probante sans
prétendre à une qualification eIDAS.
*/

-- ── 1. Profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nom_complet text NOT NULL DEFAULT '',
  couleur text DEFAULT '#3A86C8',
  role text NOT NULL DEFAULT 'commercial', -- commercial | manager | admin
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_team" ON profiles;
CREATE POLICY "profiles_select_team" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom_complet)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'nom_complet', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. Durcissement RLS : anon -> authenticated sur les tables métier ──────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospects', 'visites', 'simulations', 'dossiers', 'devis',
    'devis_lignes', 'devis_aides', 'documents', 'planning_events',
    'catalogue_produits', 'entreprises', 'interactions', 'tasks'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "public_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "public_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "public_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "public_delete_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_%s" ON %I', t, t);

      EXECUTE format('CREATE POLICY "authenticated_select_%s" ON %I FOR SELECT TO authenticated USING (true)', t, t);
      EXECUTE format('CREATE POLICY "authenticated_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
      EXECUTE format('CREATE POLICY "authenticated_update_%s" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
      EXECUTE format('CREATE POLICY "authenticated_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', t, t);
    END IF;
  END LOOP;
END $$;

-- ── 3. Nettoyage des tables mortes de la 1ère itération du schéma ─────────
DROP TABLE IF EXISTS habitations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── 4. Audit de signature ──────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devis' AND column_name='signature_audit') THEN
    ALTER TABLE devis ADD COLUMN signature_audit jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
