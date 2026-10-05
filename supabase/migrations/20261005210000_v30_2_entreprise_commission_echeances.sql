/* V30.2 — correction entreprises + échéanciers de commissions */
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS forme_juridique text DEFAULT '',
  ADD COLUMN IF NOT EXISTS capital_social text DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_tva text DEFAULT '',
  ADD COLUMN IF NOT EXISTS iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bic text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banque text DEFAULT '',
  ADD COLUMN IF NOT EXISTS conditions_paiement_defaut text DEFAULT 'Paiement à 30 jours date de facture',
  ADD COLUMN IF NOT EXISTS taux_penalite_retard text DEFAULT '3 fois le taux d''intérêt légal',
  ADD COLUMN IF NOT EXISTS escompte_defaut text DEFAULT 'Néant';

CREATE TABLE IF NOT EXISTS commission_echeances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  beneficiaire text NOT NULL CHECK (beneficiaire IN ('commercial','societe')),
  libelle text NOT NULL DEFAULT '',
  montant numeric(12,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  date_prevue date,
  date_paiement timestamptz,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commission_echeances_commission ON commission_echeances(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_echeances_beneficiaire ON commission_echeances(beneficiaire);
ALTER TABLE commission_echeances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_echeances_select_scope" ON commission_echeances;
CREATE POLICY "commission_echeances_select_scope" ON commission_echeances FOR SELECT TO authenticated USING (is_admin_ou_manager() OR EXISTS (SELECT 1 FROM commissions c WHERE c.id=commission_echeances.commission_id AND c.commercial_id=auth.uid()));
DROP POLICY IF EXISTS "commission_echeances_write_admin" ON commission_echeances;
CREATE POLICY "commission_echeances_write_admin" ON commission_echeances FOR ALL TO authenticated USING (is_admin_ou_manager()) WITH CHECK (is_admin_ou_manager());

INSERT INTO commission_echeances (commission_id, beneficiaire, libelle, montant, date_paiement, ordre)
SELECT c.id,'commercial','Paiement commercial',c.montant_commercial,c.date_paiement_commercial,0
FROM commissions c
WHERE c.montant_commercial>0
  AND NOT EXISTS (SELECT 1 FROM commission_echeances e WHERE e.commission_id=c.id AND e.beneficiaire='commercial');

-- Pour la société, on ne fabrique pas une fausse échéance de 100 % si le dossier
-- est déjà partiellement payé : le cas connu du dossier installé le 24/09/2026
-- est explicitement découpé en 750 € à l'installation + 1 250 € au déblocage MPR.
INSERT INTO commission_echeances (commission_id, beneficiaire, libelle, montant, date_paiement, ordre)
SELECT c.id,'societe','Paiement Reno Soluces',c.montant_societe,c.date_paiement_societe,0
FROM commissions c
WHERE c.montant_societe>0
  AND NOT EXISTS (SELECT 1 FROM commission_echeances e WHERE e.commission_id=c.id AND e.beneficiaire='societe')
  AND NOT EXISTS (
    SELECT 1 FROM dossiers d
    WHERE d.id=c.reference_id
      AND c.reference_type='dossier'
      AND d.date_installation = DATE '2026-09-24'
      AND c.montant_societe = 2000
  );

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT c.id INTO v_id
  FROM commissions c
  JOIN dossiers d ON d.id=c.reference_id
  WHERE c.reference_type='dossier'
    AND d.date_installation=DATE '2026-09-24'
    AND c.montant_societe=2000
  ORDER BY c.date_generation DESC
  LIMIT 1;
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commission_echeances WHERE commission_id=v_id AND beneficiaire='societe') THEN
    INSERT INTO commission_echeances (commission_id,beneficiaire,libelle,montant,date_paiement,ordre)
    VALUES (v_id,'societe','Acompte à l''installation',750,
            (SELECT date_paiement_societe FROM commissions WHERE id=v_id),0),
           (v_id,'societe','Solde au déblocage MaPrimeRénov’',1250,NULL,1);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_sync_commission_echeance_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_id uuid := COALESCE(NEW.commission_id,OLD.commission_id);
  v_com numeric; v_soc numeric; p_com numeric; p_soc numeric; d_com timestamptz; d_soc timestamptz; h_com boolean; h_soc boolean;
BEGIN
  SELECT montant_commercial,montant_societe INTO v_com,v_soc FROM commissions WHERE id=v_id;
  SELECT COALESCE(SUM(montant) FILTER (WHERE beneficiaire='commercial' AND date_paiement IS NOT NULL),0),
         COALESCE(SUM(montant) FILTER (WHERE beneficiaire='societe' AND date_paiement IS NOT NULL),0),
         MAX(date_paiement) FILTER (WHERE beneficiaire='commercial' AND date_paiement IS NOT NULL),
         MAX(date_paiement) FILTER (WHERE beneficiaire='societe' AND date_paiement IS NOT NULL),
         EXISTS(SELECT 1 FROM commission_echeances WHERE commission_id=v_id AND beneficiaire='commercial'),
         EXISTS(SELECT 1 FROM commission_echeances WHERE commission_id=v_id AND beneficiaire='societe')
  INTO p_com,p_soc,d_com,d_soc,h_com,h_soc FROM commission_echeances WHERE commission_id=v_id;
  UPDATE commissions SET
    date_paiement_commercial=CASE WHEN h_com AND COALESCE(v_com,0)>0 AND p_com>=v_com THEN d_com WHEN h_com THEN NULL ELSE date_paiement_commercial END,
    date_paiement_societe=CASE WHEN h_soc AND COALESCE(v_soc,0)>0 AND p_soc>=v_soc THEN d_soc WHEN h_soc THEN NULL ELSE date_paiement_societe END
  WHERE id=v_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_commission_echeance_summary ON commission_echeances;
CREATE TRIGGER trg_sync_commission_echeance_summary AFTER INSERT OR UPDATE OF montant,beneficiaire,date_paiement OR DELETE ON commission_echeances FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_echeance_summary();
