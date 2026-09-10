/*
# RENOVA OS — Catalogue, Devis & Aides

1. New Tables
- entreprises: tenant (l'entreprise RGE qui utilise le logiciel — préparation multi-tenant,
  la vraie isolation par entreprise via auth/RLS n'est pas encore active, cf. note en bas)
- catalogue_produits: catalogue de produits/prestations propre à chaque entreprise
- devis: devis client (lié à un prospect / dossier / visite)
- devis_lignes: lignes de devis (produit du catalogue ou ligne libre)
- devis_aides: aides mobilisées sur un devis (MaPrimeRénov, CEE, Anah, TVA réduite...)

2. Prospects
- Ajout des champs nécessaires au calcul du profil MaPrimeRénov (RFR, composition du
  foyer, zone Île-de-France)

3. Security
- RLS activé sur toutes les tables, mêmes politiques permissives (anon, authenticated)
  que le reste du schéma actuel — l'app n'a pas encore d'authentification.

4. IMPORTANT — Multi-tenant : préparation, pas encore isolation réelle
- Les tables portent déjà `entreprise_id` pour permettre plus tard un vrai cloisonnement
  entre entreprises clientes (via auth Supabase + RLS filtrant sur entreprise_id).
- EN L'ÉTAT ACTUEL (pas d'authentification), toute donnée reste visible par tout le monde,
  comme le reste de l'application. Pour vendre ce logiciel à plusieurs entreprises de façon
  sûre, il faudra activer l'authentification Supabase et re-écrire les policies RLS pour
  filtrer strictement par entreprise_id — non fait ici, à traiter avant toute mise en prod
  multi-clients.
*/

CREATE TABLE IF NOT EXISTS entreprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale text NOT NULL,
  siret text DEFAULT '',
  numero_rge text DEFAULT '',
  qualifications_rge jsonb DEFAULT '[]',
  adresse text DEFAULT '',
  code_postal text DEFAULT '',
  ville text DEFAULT '',
  telephone text DEFAULT '',
  email text DEFAULT '',
  logo_url text DEFAULT '',
  taux_cee_eur_par_mwh_cumac numeric DEFAULT 6,
  conditions_generales_devis text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_entreprises" ON entreprises;
CREATE POLICY "anon_select_entreprises" ON entreprises FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_entreprises" ON entreprises;
CREATE POLICY "anon_insert_entreprises" ON entreprises FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_entreprises" ON entreprises;
CREATE POLICY "anon_update_entreprises" ON entreprises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_entreprises" ON entreprises;
CREATE POLICY "anon_delete_entreprises" ON entreprises FOR DELETE TO anon, authenticated USING (true);

INSERT INTO entreprises (raison_sociale)
SELECT 'Mon entreprise'
WHERE NOT EXISTS (SELECT 1 FROM entreprises);

-- ---------------------------------------------------------------------------
-- CATALOGUE PRODUITS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalogue_produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE,
  categorie text NOT NULL, -- combles / murs / plancher / menuiseries / pac / pac_air_air / ballon_thermodynamique / vmc ...
  nom text NOT NULL,
  marque text DEFAULT '',
  reference text DEFAULT '',
  description text DEFAULT '',
  caracteristiques jsonb DEFAULT '{}', -- performances techniques : COP, R, Uw, rendement, puissance...
  prix_unitaire_ht numeric NOT NULL DEFAULT 0,
  unite text NOT NULL DEFAULT 'unite', -- m2 / unite / forfait / kw / ml
  tva_taux numeric NOT NULL DEFAULT 20, -- 5.5 / 10 / 20
  eligible_mpr boolean DEFAULT false,
  eligible_cee boolean DEFAULT false,
  fiche_cee text DEFAULT '', -- ex: BAR-EN-101, BAR-TH-104...
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catalogue_produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_catalogue_produits" ON catalogue_produits;
CREATE POLICY "anon_select_catalogue_produits" ON catalogue_produits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_catalogue_produits" ON catalogue_produits;
CREATE POLICY "anon_insert_catalogue_produits" ON catalogue_produits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_catalogue_produits" ON catalogue_produits;
CREATE POLICY "anon_update_catalogue_produits" ON catalogue_produits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_catalogue_produits" ON catalogue_produits;
CREATE POLICY "anon_delete_catalogue_produits" ON catalogue_produits FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_catalogue_produits_entreprise ON catalogue_produits(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_produits_categorie ON catalogue_produits(categorie);

-- ---------------------------------------------------------------------------
-- DEVIS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  visite_id uuid REFERENCES visites(id) ON DELETE SET NULL,
  dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL,
  numero text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'brouillon', -- brouillon / envoye / signe / refuse / expire
  type_operation text NOT NULL DEFAULT 'mono_geste', -- mono_geste / renovation_ampleur
  date_creation timestamptz DEFAULT now(),
  date_validite date,
  montant_ht numeric NOT NULL DEFAULT 0,
  montant_tva numeric NOT NULL DEFAULT 0,
  montant_ttc numeric NOT NULL DEFAULT 0,
  montant_aides numeric NOT NULL DEFAULT 0,
  reste_a_charge numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  signature_statut text DEFAULT 'non_envoye', -- non_envoye / envoye / signe / refuse
  signature_date timestamptz,
  signature_provider text DEFAULT '',
  signature_document_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_devis" ON devis;
CREATE POLICY "anon_select_devis" ON devis FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_devis" ON devis;
CREATE POLICY "anon_insert_devis" ON devis FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_devis" ON devis;
CREATE POLICY "anon_update_devis" ON devis FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_devis" ON devis;
CREATE POLICY "anon_delete_devis" ON devis FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_devis_prospect ON devis(prospect_id);

CREATE TABLE IF NOT EXISTS devis_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  produit_id uuid REFERENCES catalogue_produits(id) ON DELETE SET NULL,
  designation text NOT NULL DEFAULT '',
  description text DEFAULT '',
  caracteristiques jsonb DEFAULT '{}', -- copie figée des caractéristiques produit au moment du devis
  quantite numeric NOT NULL DEFAULT 1,
  prix_unitaire_ht numeric NOT NULL DEFAULT 0,
  tva_taux numeric NOT NULL DEFAULT 20,
  montant_ht numeric NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_devis_lignes" ON devis_lignes;
CREATE POLICY "anon_select_devis_lignes" ON devis_lignes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_devis_lignes" ON devis_lignes;
CREATE POLICY "anon_insert_devis_lignes" ON devis_lignes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_devis_lignes" ON devis_lignes;
CREATE POLICY "anon_update_devis_lignes" ON devis_lignes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_devis_lignes" ON devis_lignes;
CREATE POLICY "anon_delete_devis_lignes" ON devis_lignes FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON devis_lignes(devis_id);

CREATE TABLE IF NOT EXISTS devis_aides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  type text NOT NULL, -- maprimerenov / cee / anah_ampleur / eco_ptz / tva_reduite
  libelle text NOT NULL DEFAULT '',
  montant numeric NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}', -- profil utilisé, geste, calcul détaillé, sources
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devis_aides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_devis_aides" ON devis_aides;
CREATE POLICY "anon_select_devis_aides" ON devis_aides FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_devis_aides" ON devis_aides;
CREATE POLICY "anon_insert_devis_aides" ON devis_aides FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_devis_aides" ON devis_aides;
CREATE POLICY "anon_update_devis_aides" ON devis_aides FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_devis_aides" ON devis_aides;
CREATE POLICY "anon_delete_devis_aides" ON devis_aides FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_devis_aides_devis ON devis_aides(devis_id);

-- ---------------------------------------------------------------------------
-- PROSPECTS — donnée manquante pour le calcul du profil MaPrimeRénov
-- ---------------------------------------------------------------------------
-- Les champs rfr, nombre_personnes_foyer, categorie_mpr, statut_occupation existent déjà
-- (migration 20260719172311_enrich_prospects_wizard.sql). Seule la zone Île-de-France /
-- hors Île-de-France manque : les plafonds de ressources ANAH diffèrent entre les deux.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'zone_ile_de_france') THEN
    ALTER TABLE prospects ADD COLUMN zone_ile_de_france boolean DEFAULT false;
  END IF;
END $$;
