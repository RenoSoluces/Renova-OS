/*
# Add audit_data to visites table

Adds a jsonb column `audit_data` to the `visites` table to store
the full structured data collected during the technical audit wizard
(sections 01–09: identification, données bâtiment, murs, menuiseries,
planchers, plafonds, ventilation, chauffage, ECS).

1. Modified Tables
   - `visites`: new column `audit_data jsonb` — stores the entire
     audit form state keyed by section name (identification,
     donnees_batiment, murs, etc.), plus `completed_sections int[]`
     tracking which section numbers have been validated.

2. Notes
   - Column is nullable; existing rows are unaffected.
   - No policy changes — existing anon/authenticated RLS on visites covers it.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visites' AND column_name = 'audit_data'
  ) THEN
    ALTER TABLE visites ADD COLUMN audit_data jsonb;
  END IF;
END $$;
