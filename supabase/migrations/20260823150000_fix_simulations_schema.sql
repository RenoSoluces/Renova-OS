/*
# RENOVA OS — Correction critique du schéma `simulations`

## Le bug
Comme pour `dossiers` (voir migration 20260822130000), deux migrations
différentes contenaient un `CREATE TABLE IF NOT EXISTS simulations` avec des
colonnes incompatibles :
  - La première (2026-07-16, celle qui a réellement créé la table) définit
    `habitation_id uuid NOT NULL REFERENCES habitations(id)`, `travaux_proposes`,
    `montant_total`, `rentabilite`... et PAS de colonne `nom`.
  - La seconde (2026-07-20, jamais appliquée car la table existait déjà)
    définit `nom`, `config_avant`, `resultat_avant`, `config_apres`,
    `resultat_apres`, `aides`.

Le code applicatif (VisitesPage → "Enregistrer comme simulation") écrit avec
les noms de colonnes de la **seconde** définition, qui n'existent pas dans la
table réelle. Pire : `habitation_id` est NOT NULL sur la table réelle, alors
que la table `habitations` a été supprimée par la migration de nettoyage
(20260822090000). Résultat : **tout enregistrement de simulation échouait
silencieusement** (l'erreur Supabase n'était pas remontée à l'écran).

## La correction
- `habitation_id` passe en nullable (la table `habitations` n'existe plus).
- Ajout des colonnes réellement utilisées par le code : `nom`, `config_avant`,
  `resultat_avant`, `config_apres`, `resultat_apres`, `aides`.
- Ajout de `dpe_avant` / `dpe_apres` (étiquettes A-G, pour affichage rapide en
  liste) et `travaux_json` (recommandations de travaux du moteur 3CL), pour
  permettre de recréer un devis directement depuis une simulation enregistrée.
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='habitation_id' AND is_nullable='NO') THEN
    ALTER TABLE simulations ALTER COLUMN habitation_id DROP NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='nom') THEN
    ALTER TABLE simulations ADD COLUMN nom text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='config_avant') THEN
    ALTER TABLE simulations ADD COLUMN config_avant jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='resultat_avant') THEN
    ALTER TABLE simulations ADD COLUMN resultat_avant jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='config_apres') THEN
    ALTER TABLE simulations ADD COLUMN config_apres jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='resultat_apres') THEN
    ALTER TABLE simulations ADD COLUMN resultat_apres jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='aides') THEN
    ALTER TABLE simulations ADD COLUMN aides jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='dpe_avant') THEN
    ALTER TABLE simulations ADD COLUMN dpe_avant text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='dpe_apres') THEN
    ALTER TABLE simulations ADD COLUMN dpe_apres text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='simulations' AND column_name='travaux_json') THEN
    ALTER TABLE simulations ADD COLUMN travaux_json jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
