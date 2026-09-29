/* RENOVA OS — Commerciaux historiques + pot commun */

CREATE TABLE IF NOT EXISTS commerciaux_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet text NOT NULL,
  email text,
  telephone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commerciaux_historique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commerciaux_historique_select" ON commerciaux_historique;
CREATE POLICY "commerciaux_historique_select" ON commerciaux_historique
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "commerciaux_historique_admin_write" ON commerciaux_historique;
CREATE POLICY "commerciaux_historique_admin_write" ON commerciaux_historique
  FOR ALL TO authenticated
  USING (is_admin_ou_manager())
  WITH CHECK (is_admin_ou_manager());

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS commercial_historique_id uuid REFERENCES commerciaux_historique(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pot_commun boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pot_commun_at timestamptz,
  ADD COLUMN IF NOT EXISTS pot_commun_ancien_commercial text;

CREATE INDEX IF NOT EXISTS idx_prospects_pot_commun ON prospects(pot_commun, commercial_id);
CREATE INDEX IF NOT EXISTS idx_prospects_commercial_historique ON prospects(commercial_historique_id);

-- Recalcule la dernière activité métier connue puis place dans le pot commun
-- les prospects actifs sans action depuis au moins 90 jours.
CREATE OR REPLACE FUNCTION actualiser_pot_commun()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nb integer := 0;
BEGIN
  WITH activity AS (
    SELECT
      p.id,
      GREATEST(
        p.created_at,
        COALESCE(p.derniere_interaction_at, p.created_at),
        COALESCE((SELECT max(i.created_at) FROM interactions i WHERE i.prospect_id = p.id), p.created_at),
        COALESCE((SELECT max(v.created_at) FROM visites v WHERE v.prospect_id = p.id), p.created_at),
        COALESCE((SELECT max(d.created_at) FROM devis d WHERE d.prospect_id = p.id), p.created_at),
        COALESCE((SELECT max(d.created_at) FROM dossiers d WHERE d.prospect_id = p.id), p.created_at),
        COALESCE((SELECT max(s.created_at) FROM simulations s WHERE s.prospect_id = p.id), p.created_at),
        COALESCE((SELECT max(t.created_at) FROM tasks t WHERE t.prospect_id = p.id), p.created_at)
      ) AS last_activity
    FROM prospects p
    WHERE p.commercial_id IS NOT NULL
      AND COALESCE(p.pot_commun, false) = false
      AND COALESCE(lower(p.statut), '') NOT IN ('perdu', 'refusé', 'refuse', 'installé')
  )
  UPDATE prospects p
  SET pot_commun = true,
      pot_commun_at = now(),
      pot_commun_ancien_commercial = p.commercial,
      commercial_id = NULL,
      commercial = NULL
  FROM activity a
  WHERE p.id = a.id
    AND a.last_activity < now() - interval '90 days';

  GET DIAGNOSTICS nb = ROW_COUNT;
  RETURN nb;
END;
$$;

GRANT EXECUTE ON FUNCTION actualiser_pot_commun() TO authenticated;

-- Toute reprise manuelle par un commercial sort immédiatement du pot commun.
CREATE OR REPLACE FUNCTION sortir_du_pot_commun()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.commercial_id IS NOT NULL AND (OLD.commercial_id IS DISTINCT FROM NEW.commercial_id OR OLD.pot_commun = true) THEN
    NEW.pot_commun := false;
    NEW.pot_commun_at := NULL;
    NEW.pot_commun_ancien_commercial := NULL;
    NEW.derniere_interaction_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sortir_pot_commun ON prospects;
CREATE TRIGGER trg_sortir_pot_commun
BEFORE UPDATE OF commercial_id, pot_commun ON prospects
FOR EACH ROW EXECUTE FUNCTION sortir_du_pot_commun();
