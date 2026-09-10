/*
# RENOVA OS — Visite "produit" & catalogue des dispositifs d'aides

## 1. Visites ciblées sur un seul produit
Jusqu'ici une visite technique parcourait obligatoirement les 9 sections de
l'audit complet. On ajoute un mode "produit" : le commercial choisit un
geste précis (PAC, isolation combles, chauffe-eau thermo...) et le wizard ne
lui demande que les données strictement nécessaires à ce geste (+ identité
du client et données générales du bâtiment, indispensables au moteur 3CL).

- `visites.type_visite` : 'complete' (défaut, comportement actuel) | 'produit'
- `visites.produit_cible` : code technique du produit ciblé (ex: 'pac',
  'combles'...), aligné sur les types de travaux du moteur 3CL. Nul en mode
  complet.

## 2. Catalogue des dispositifs d'aides (référentiel)
Table de référence — indépendante du catalogue commercial `catalogue_produits`
— qui recense les dispositifs d'aides mobilisables (fiches CEE d'opérations
standardisées + barème MaPrimeRénov') par catégorie de travaux, secteur et
public. Utilisée pour afficher les aides mobilisables lors d'une visite
"produit" et pour un futur écran de consultation/mise à jour du catalogue.

- `dispositifs_aides` : une ligne par dispositif (fiche CEE ou geste MPR)
- `dispositifs_sync_log` : historique des tentatives de mise à jour du
  catalogue (manuelles ou automatisées via une future Edge Function)

Le référentiel est initialisé avec une sélection de fiches réellement en
vigueur (résidentiel BAR + tertiaire/professionnel BAT), à compléter et
maintenir à jour dans le temps (voir écran Paramètres > Dispositifs).
*/

-- ── 1. Visites : mode complet ou ciblé produit ─────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visites' AND column_name='type_visite') THEN
    ALTER TABLE visites ADD COLUMN type_visite text NOT NULL DEFAULT 'complete';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visites' AND column_name='produit_cible') THEN
    ALTER TABLE visites ADD COLUMN produit_cible text;
  END IF;
END $$;

-- ── 2. Catalogue des dispositifs d'aides ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dispositifs_aides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                 -- ex: 'BAR-TH-171', 'MPR-PAC-AE'
  dispositif text NOT NULL,                  -- 'cee' | 'mpr'
  libelle text NOT NULL,                     -- dénomination officielle courte
  description text DEFAULT '',
  secteur text NOT NULL DEFAULT 'residentiel', -- 'residentiel' | 'tertiaire'
  public_cible text NOT NULL DEFAULT 'particulier', -- 'particulier' | 'professionnel' | 'tous'
  categorie text NOT NULL,                   -- aligné sur TypeTravaux du moteur 3CL
  statut text NOT NULL DEFAULT 'active',     -- 'active' | 'abrogee'
  date_debut_validite date,
  date_fin_validite date,
  source_url text DEFAULT '',
  derniere_verification date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dispositifs_aides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_dispositifs_aides" ON dispositifs_aides;
CREATE POLICY "authenticated_select_dispositifs_aides" ON dispositifs_aides FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_dispositifs_aides" ON dispositifs_aides;
CREATE POLICY "authenticated_insert_dispositifs_aides" ON dispositifs_aides FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_dispositifs_aides" ON dispositifs_aides;
CREATE POLICY "authenticated_update_dispositifs_aides" ON dispositifs_aides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_dispositifs_aides" ON dispositifs_aides;
CREATE POLICY "authenticated_delete_dispositifs_aides" ON dispositifs_aides FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS dispositifs_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manuel',     -- 'manuel' | 'edge_function'
  ajoutes integer NOT NULL DEFAULT 0,
  mis_a_jour integer NOT NULL DEFAULT 0,
  erreurs integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dispositifs_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_sync_log" ON dispositifs_sync_log;
CREATE POLICY "authenticated_select_sync_log" ON dispositifs_sync_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_sync_log" ON dispositifs_sync_log;
CREATE POLICY "authenticated_insert_sync_log" ON dispositifs_sync_log FOR INSERT TO authenticated WITH CHECK (true);

-- ── 3. Amorçage du référentiel (situation connue à la création de cette
--       migration — à tenir à jour, les fiches CEE évoluent plusieurs fois
--       par an par arrêté) ────────────────────────────────────────────────
INSERT INTO dispositifs_aides (code, dispositif, libelle, description, secteur, public_cible, categorie, statut, source_url) VALUES
  -- Isolation — combles / toitures
  ('BAR-EN-101', 'cee', 'Isolation de combles ou de toitures', 'Isolation thermique des combles perdus, rampants de toiture ou toitures-terrasses en logement résidentiel existant.', 'residentiel', 'particulier', 'combles', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-ISOL-COMBLES', 'mpr', 'MaPrimeRénov'' — Isolation des combles', 'Prime forfaitaire MaPrimeRénov'' pour l''isolation des combles ou toitures, cumulable avec les CEE.', 'residentiel', 'particulier', 'combles', 'active', 'https://www.maprimerenov.gouv.fr'),
  ('BAT-EN-101', 'cee', 'Isolation de combles ou de toitures (tertiaire)', 'Isolation thermique de combles ou toitures dans un bâtiment tertiaire existant.', 'tertiaire', 'professionnel', 'combles', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),

  -- Isolation — murs
  ('BAR-EN-102', 'cee', 'Isolation des murs', 'Isolation thermique par l''intérieur ou l''extérieur des murs donnant sur l''extérieur ou sur un local non chauffé.', 'residentiel', 'particulier', 'murs', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-ISOL-MURS', 'mpr', 'MaPrimeRénov'' — Isolation des murs', 'Prime forfaitaire pour l''isolation des murs par l''intérieur ou l''extérieur.', 'residentiel', 'particulier', 'murs', 'active', 'https://www.maprimerenov.gouv.fr'),
  ('BAT-EN-102', 'cee', 'Isolation de murs (tertiaire)', 'Isolation thermique de murs donnant sur l''extérieur dans un bâtiment tertiaire.', 'tertiaire', 'professionnel', 'murs', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),

  -- Isolation — planchers bas
  ('BAR-EN-103', 'cee', 'Isolation d''un plancher bas', 'Isolation thermique d''un plancher bas sur sous-sol, vide sanitaire ou passage ouvert.', 'residentiel', 'particulier', 'plancher', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-ISOL-PLANCHER', 'mpr', 'MaPrimeRénov'' — Isolation plancher bas', 'Prime forfaitaire pour l''isolation d''un plancher bas.', 'residentiel', 'particulier', 'plancher', 'active', 'https://www.maprimerenov.gouv.fr'),

  -- Menuiseries
  ('BAR-EN-104', 'cee', 'Fenêtre ou porte-fenêtre avec vitrage isolant', 'Remplacement de fenêtres ou portes-fenêtres par des menuiseries à double vitrage isolant performant.', 'residentiel', 'particulier', 'menuiseries', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-MENUISERIES', 'mpr', 'MaPrimeRénov'' — Menuiseries', 'Prime forfaitaire au remplacement de fenêtres ou portes-fenêtres (montant réduit, geste isolé non prioritaire pour MPR).', 'residentiel', 'particulier', 'menuiseries', 'active', 'https://www.maprimerenov.gouv.fr'),

  -- Pompe à chaleur air/eau
  ('BAR-TH-171', 'cee', 'Pompe à chaleur de type air/eau', 'Mise en place d''une PAC air/eau en remplacement d''un système de chauffage existant, maison individuelle. Bonification "Coup de pouce Chauffage" possible.', 'residentiel', 'particulier', 'pac', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('BAR-TH-179', 'cee', 'Pompe à chaleur collective de type air/eau', 'Mise en place d''une PAC air/eau collective en habitat collectif.', 'residentiel', 'particulier', 'pac', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-PAC-AE', 'mpr', 'MaPrimeRénov'' — Pompe à chaleur air/eau', 'Prime MaPrimeRénov'' pour l''installation d''une PAC air/eau, montant selon profil de ressources.', 'residentiel', 'particulier', 'pac', 'active', 'https://www.maprimerenov.gouv.fr'),
  ('BAT-TH-116', 'cee', 'Pompe à chaleur air/eau (tertiaire)', 'Mise en place d''une PAC air/eau pour le chauffage de locaux tertiaires.', 'tertiaire', 'professionnel', 'pac', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),

  -- Pompe à chaleur air/air
  ('BAR-TH-129', 'cee', 'Pompe à chaleur de type air/air', 'Mise en place d''une PAC air/air en remplacement d''une installation de chauffage électrique direct.', 'residentiel', 'particulier', 'pac_air_air', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),

  -- Chaudière biomasse (regroupée ici sous "pac" côté produit "chauffage bois" — catégorie dédiée conservée pour le référentiel)
  ('BAR-TH-113', 'cee', 'Chaudière biomasse individuelle', 'Mise en place d''une chaudière biomasse (bois, granulés) en remplacement d''un système de chauffage existant.', 'residentiel', 'particulier', 'pac', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-BIOMASSE', 'mpr', 'MaPrimeRénov'' — Chaudière biomasse', 'Prime MaPrimeRénov'' pour l''installation d''une chaudière biomasse performante.', 'residentiel', 'particulier', 'pac', 'active', 'https://www.maprimerenov.gouv.fr'),

  -- Ballon thermodynamique / ECS
  ('BAR-TH-148', 'cee', 'Chauffe-eau thermodynamique à accumulation', 'Mise en place d''un chauffe-eau thermodynamique (ballon thermo) en remplacement d''un système ECS existant.', 'residentiel', 'particulier', 'ballon_thermodynamique', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('MPR-BALLON-THERMO', 'mpr', 'MaPrimeRénov'' — Chauffe-eau thermodynamique', 'Prime MaPrimeRénov'' pour l''installation d''un ballon thermodynamique.', 'residentiel', 'particulier', 'ballon_thermodynamique', 'active', 'https://www.maprimerenov.gouv.fr'),
  ('BAR-TH-101', 'cee', 'Chauffe-eau solaire individuel', 'Mise en place d''un chauffe-eau solaire individuel (CESI).', 'residentiel', 'particulier', 'ballon_thermodynamique', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),

  -- Ventilation
  ('BAR-TH-125', 'cee', 'VMC simple flux hygroréglable', 'Mise en place d''une ventilation mécanique contrôlée simple flux hygroréglable de type A ou B.', 'residentiel', 'particulier', 'vmc', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('BAR-TH-127', 'cee', 'VMC double flux autoréglable ou modulée', 'Mise en place d''une ventilation double flux à haute performance avec échangeur de chaleur.', 'residentiel', 'particulier', 'vmc', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie'),
  ('BAT-TH-127', 'cee', 'VMC double flux (tertiaire)', 'Mise en place d''une VMC double flux à haute performance en bâtiment tertiaire.', 'tertiaire', 'professionnel', 'vmc', 'active', 'https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie')
ON CONFLICT (code) DO NOTHING;
