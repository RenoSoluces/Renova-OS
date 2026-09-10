/*
# RENOVA OS — Correction critique du schéma `visites`

## Le bug
Même défaut que `dossiers` (20260822130000) et `simulations` (20260823150000) :
deux migrations concurrentes définissaient `visites` avec des schémas
incompatibles. La table réellement en place (première créée, 2026-07-16) a :
  - `habitation_id uuid NOT NULL REFERENCES habitations(id)` — la table
    `habitations` a été supprimée par la migration de nettoyage
    (20260822090000), rendant cette colonne impossible à satisfaire.
  - une colonne `date` (et non `date_visite`).

Le code applicatif (`VisitesPage.createVisite`) écrit avec `date_visite`
(colonne inexistante) et ne fournit jamais `habitation_id` (obligatoire).
**Toute création d'une nouvelle visite technique échouait donc silencieusement
depuis le début** — le point d'entrée le plus fondamental de l'application.

## La correction
- `habitation_id` passe en nullable.
- Ajout de la colonne `date_visite` réellement utilisée par le code.
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visites' AND column_name='habitation_id' AND is_nullable='NO') THEN
    ALTER TABLE visites ALTER COLUMN habitation_id DROP NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visites' AND column_name='date_visite') THEN
    ALTER TABLE visites ADD COLUMN date_visite date DEFAULT CURRENT_DATE;
  END IF;
END $$;
