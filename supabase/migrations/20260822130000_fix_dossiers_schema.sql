/*
# RENOVA OS — Correction du schéma `dossiers`

## Contexte
Deux migrations différentes contenaient un `CREATE TABLE IF NOT EXISTS dossiers`
avec des colonnes différentes (2026-07-16 puis 2026-07-20). Comme la table
existait déjà depuis la première, la seconde définition (qui apportait
`visite_id`, `montant_total`, `aides_montant`, `reste_a_charge`) n'a jamais
été appliquée. Le code applicatif (types TypeScript, DossiersPage, DevisPage)
suppose que ces colonnes existent : cette migration les ajoute réellement.

## Colonnes ajoutées à `dossiers`
- `visite_id` : lien vers la visite technique à l'origine du dossier
- `montant_total`, `aides_montant`, `reste_a_charge` : synthèse financière du
  dossier, dupliquée depuis le devis au moment de la signature pour un accès
  rapide en liste (source de vérité = devis lié)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'visite_id') THEN
    ALTER TABLE dossiers ADD COLUMN visite_id uuid REFERENCES visites(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'montant_total') THEN
    ALTER TABLE dossiers ADD COLUMN montant_total numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'aides_montant') THEN
    ALTER TABLE dossiers ADD COLUMN aides_montant numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'reste_a_charge') THEN
    ALTER TABLE dossiers ADD COLUMN reste_a_charge numeric(12,2) DEFAULT 0;
  END IF;
END $$;
