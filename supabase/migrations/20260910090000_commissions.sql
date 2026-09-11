/*
# Commissions commerciales & techniciens

## Contexte
Deux nouveaux besoins métier :
1. Une visite technique (VT) posée dans l'agenda et attribuée à un commercial ou un
   technicien doit générer une commission, avec un montant différent pour la personne
   (ce qui lui est reversé) et pour la société (le coût / prix facturé en interne).
2. Un barème de commissions prédéfini par l'admin doit s'appliquer automatiquement
   (VT posée, devis signé…) sans ressaisie manuelle, afin que le compteur de
   commissions du commercial se remplisse tout seul.

## Contenu
- `commission_bareme` : règles prédéfinies par type d'événement commissionnable.
- `commissions` : instances réelles de commission, rattachées à un commercial/technicien,
  avec un statut de workflow (en attente / validée / payée / annulée).
- Colonnes `commission_montant_commercial` / `commission_montant_societe` sur
  `planning_events`, permettant à l'admin de surcharger le barème au cas par cas
  lorsqu'il pose une VT.
- Triggers : génération/mise à jour automatique de la commission quand une VT est
  attribuée dans l'agenda, et quand un devis passe au statut "signe".
*/

-- ── 1. Barème de commissions (règles prédéfinies) ───────────────────────────
CREATE TABLE IF NOT EXISTS commission_bareme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'vt' | 'devis_signe' | 'manuel'
  libelle text NOT NULL,
  montant_commercial numeric NOT NULL DEFAULT 0,   -- montant fixe reversé au commercial/technicien
  montant_societe numeric NOT NULL DEFAULT 0,       -- coût / valorisation côté société
  pourcentage_commercial numeric,                   -- optionnel : % appliqué (ex. sur le montant HT d'un devis signé)
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_bareme_type_actif ON commission_bareme(type, actif);

ALTER TABLE commission_bareme ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_bareme_select_all" ON commission_bareme;
CREATE POLICY "commission_bareme_select_all" ON commission_bareme
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "commission_bareme_write_admin" ON commission_bareme;
CREATE POLICY "commission_bareme_write_admin" ON commission_bareme
  FOR INSERT TO authenticated WITH CHECK (is_admin_ou_manager());
DROP POLICY IF EXISTS "commission_bareme_update_admin" ON commission_bareme;
CREATE POLICY "commission_bareme_update_admin" ON commission_bareme
  FOR UPDATE TO authenticated USING (is_admin_ou_manager()) WITH CHECK (is_admin_ou_manager());
DROP POLICY IF EXISTS "commission_bareme_delete_admin" ON commission_bareme;
CREATE POLICY "commission_bareme_delete_admin" ON commission_bareme
  FOR DELETE TO authenticated USING (is_admin_ou_manager());

-- ── 2. Commissions (instances réelles) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'vt' | 'devis_signe' | 'manuel'
  libelle text NOT NULL DEFAULT '',
  reference_type text, -- 'planning_events' | 'devis' | null (commission manuelle)
  reference_id uuid,
  montant_commercial numeric NOT NULL DEFAULT 0,
  montant_societe numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'en_attente', -- en_attente | validee | payee | annulee
  date_generation timestamptz NOT NULL DEFAULT now(),
  date_validation timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_commercial_id ON commissions(commercial_id);
CREATE INDEX IF NOT EXISTS idx_commissions_statut ON commissions(statut);
-- Une seule commission générée automatiquement par événement source (VT / devis) :
-- évite les doublons si le trigger se redéclenche sur une mise à jour.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_reference
  ON commissions(reference_type, reference_id) WHERE reference_id IS NOT NULL;

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_select_scope" ON commissions;
CREATE POLICY "commissions_select_scope" ON commissions
  FOR SELECT TO authenticated USING (commercial_id = auth.uid() OR is_admin_ou_manager());

-- Les commissions générées par les triggers passent par une fonction SECURITY DEFINER
-- (voir plus bas) : les policies ci-dessous couvrent uniquement les actions manuelles
-- d'un admin/manager (commission ponctuelle, changement de statut, correction).
DROP POLICY IF EXISTS "commissions_insert_admin" ON commissions;
CREATE POLICY "commissions_insert_admin" ON commissions
  FOR INSERT TO authenticated WITH CHECK (is_admin_ou_manager());
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;
CREATE POLICY "commissions_update_admin" ON commissions
  FOR UPDATE TO authenticated USING (is_admin_ou_manager()) WITH CHECK (is_admin_ou_manager());
DROP POLICY IF EXISTS "commissions_delete_admin" ON commissions;
CREATE POLICY "commissions_delete_admin" ON commissions
  FOR DELETE TO authenticated USING (is_admin_ou_manager());

-- ── 3. VT dans l'agenda : montants spécifiques commercial / société ─────────
ALTER TABLE planning_events
  ADD COLUMN IF NOT EXISTS commission_montant_commercial numeric,
  ADD COLUMN IF NOT EXISTS commission_montant_societe numeric;

-- ── 4. Génération automatique de la commission depuis une VT de l'agenda ────
-- Un événement d'agenda de type 'visite' (= VT) attribué à un commercial/technicien
-- génère (ou met à jour) sa commission. Si l'admin n'a pas saisi de montant, on
-- retombe sur le barème actif de type 'vt'. Si l'événement est réattribué à personne
-- ou change de type, la commission associée est supprimée.
CREATE OR REPLACE FUNCTION fn_sync_commission_vt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bareme_vt commission_bareme%ROWTYPE;
  m_commercial numeric;
  m_societe numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM commissions WHERE reference_type = 'planning_events' AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.type = 'visite' AND NEW.user_id IS NOT NULL THEN
    SELECT * INTO bareme_vt FROM commission_bareme
      WHERE type = 'vt' AND actif = true
      ORDER BY created_at DESC LIMIT 1;

    m_commercial := COALESCE(NEW.commission_montant_commercial, bareme_vt.montant_commercial, 0);
    m_societe := COALESCE(NEW.commission_montant_societe, bareme_vt.montant_societe, 0);

    INSERT INTO commissions (
      commercial_id, type, libelle, reference_type, reference_id,
      montant_commercial, montant_societe, statut
    ) VALUES (
      NEW.user_id, 'vt', 'Visite technique — ' || COALESCE(NEW.titre, ''), 'planning_events', NEW.id,
      m_commercial, m_societe, 'en_attente'
    )
    ON CONFLICT (reference_type, reference_id) DO UPDATE SET
      commercial_id = EXCLUDED.commercial_id,
      libelle = EXCLUDED.libelle,
      montant_commercial = EXCLUDED.montant_commercial,
      montant_societe = EXCLUDED.montant_societe;
  ELSE
    -- Plus de VT valide (type changé ou non-attribué) : on retire la commission liée.
    DELETE FROM commissions WHERE reference_type = 'planning_events' AND reference_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_vt ON planning_events;
CREATE TRIGGER trg_sync_commission_vt
  AFTER INSERT OR UPDATE OF type, user_id, commission_montant_commercial, commission_montant_societe OR DELETE
  ON planning_events
  FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_vt();

-- ── 5. Génération automatique de la commission quand un devis est signé ─────
CREATE OR REPLACE FUNCTION fn_sync_commission_devis_signe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bareme_devis commission_bareme%ROWTYPE;
  v_commercial_id uuid;
  m_commercial numeric;
  m_societe numeric;
BEGIN
  IF NEW.statut <> 'signe' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'signe' THEN
    RETURN NEW; -- déjà signé précédemment, rien de nouveau à générer
  END IF;

  SELECT commercial_id INTO v_commercial_id FROM prospects WHERE id = NEW.prospect_id;
  IF v_commercial_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO bareme_devis FROM commission_bareme
    WHERE type = 'devis_signe' AND actif = true
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW; -- pas de barème actif défini pour les devis signés : rien à générer
  END IF;

  m_commercial := COALESCE(bareme_devis.montant_commercial, 0)
    + COALESCE(bareme_devis.pourcentage_commercial, 0) / 100 * COALESCE(NEW.montant_ht, 0);
  m_societe := COALESCE(bareme_devis.montant_societe, NEW.montant_ht, 0);

  INSERT INTO commissions (
    commercial_id, type, libelle, reference_type, reference_id,
    montant_commercial, montant_societe, statut
  ) VALUES (
    v_commercial_id, 'devis_signe', 'Devis signé — ' || COALESCE(NEW.numero, ''), 'devis', NEW.id,
    m_commercial, m_societe, 'en_attente'
  )
  ON CONFLICT (reference_type, reference_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON devis;
CREATE TRIGGER trg_sync_commission_devis_signe
  AFTER INSERT OR UPDATE OF statut ON devis
  FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_devis_signe();
