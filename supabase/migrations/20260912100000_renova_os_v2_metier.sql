/* RENOVA OS V2 — commissions par commercial/produit + installation + SAV + audit */
ALTER TABLE commission_bareme
  ADD COLUMN IF NOT EXISTS commercial_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES catalogue_produits(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'fixe',
  ADD COLUMN IF NOT EXISTS base_pourcentage text NOT NULL DEFAULT 'montant_ht',
  ADD COLUMN IF NOT EXISTS priorite integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_debut date,
  ADD COLUMN IF NOT EXISTS date_fin date;
CREATE INDEX IF NOT EXISTS idx_commission_bareme_matching ON commission_bareme(type, actif, commercial_id, produit_id, priorite);

ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES catalogue_produits(id) ON DELETE SET NULL;

ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS installateur_id uuid,
  ADD COLUMN IF NOT EXISTS date_installation_prevue date,
  ADD COLUMN IF NOT EXISTS date_installation date,
  ADD COLUMN IF NOT EXISTS garantie_fin date,
  ADD COLUMN IF NOT EXISTS notes_installation text DEFAULT '';

CREATE TABLE IF NOT EXISTS installateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  contact text DEFAULT '',
  telephone text DEFAULT '',
  email text DEFAULT '',
  adresse text DEFAULT '',
  code_postal text DEFAULT '',
  ville text DEFAULT '',
  zone_intervention text DEFAULT '',
  specialites text[] DEFAULT '{}',
  numero_rge text DEFAULT '',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dossiers ADD CONSTRAINT fk_dossiers_installateur FOREIGN KEY (installateur_id) REFERENCES installateurs(id) ON DELETE SET NULL;
ALTER TABLE installateurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS installateurs_select ON installateurs;
CREATE POLICY installateurs_select ON installateurs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS installateurs_write ON installateurs;
CREATE POLICY installateurs_write ON installateurs FOR ALL TO authenticated USING (is_admin_ou_manager()) WITH CHECK (is_admin_ou_manager());

CREATE TABLE IF NOT EXISTS sav_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'sav',
  statut text NOT NULL DEFAULT 'ouvert',
  description text NOT NULL DEFAULT '',
  date_signalement timestamptz NOT NULL DEFAULT now(),
  date_intervention timestamptz,
  compte_rendu text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sav_interventions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sav_select ON sav_interventions;
CREATE POLICY sav_select ON sav_interventions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sav_write ON sav_interventions;
CREATE POLICY sav_write ON sav_interventions FOR ALL TO authenticated USING (is_admin_ou_manager() OR EXISTS (SELECT 1 FROM dossiers d JOIN prospects p ON p.id=d.prospect_id WHERE d.id=sav_interventions.dossier_id AND p.commercial_id=auth.uid())) WITH CHECK (is_admin_ou_manager() OR EXISTS (SELECT 1 FROM dossiers d JOIN prospects p ON p.id=d.prospect_id WHERE d.id=sav_interventions.dossier_id AND p.commercial_id=auth.uid()));

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_select_admin ON audit_logs;
CREATE POLICY audit_select_admin ON audit_logs FOR SELECT TO authenticated USING (is_admin_ou_manager() OR user_id=auth.uid());

CREATE OR REPLACE FUNCTION fn_commission_rule(p_type text, p_commercial uuid, p_produit uuid, p_date date)
RETURNS commission_bareme
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT cb.* FROM commission_bareme cb
  WHERE cb.type=p_type AND cb.actif=true
    AND (cb.date_debut IS NULL OR cb.date_debut<=p_date)
    AND (cb.date_fin IS NULL OR cb.date_fin>=p_date)
    AND (cb.commercial_id IS NULL OR cb.commercial_id=p_commercial)
    AND (cb.produit_id IS NULL OR cb.produit_id=p_produit)
  ORDER BY
    ((cb.commercial_id IS NOT NULL)::int + (cb.produit_id IS NOT NULL)::int) DESC,
    cb.priorite DESC,
    cb.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION fn_sync_commission_vt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r commission_bareme%ROWTYPE; m_com numeric; m_soc numeric;
BEGIN
  IF TG_OP='DELETE' THEN DELETE FROM commissions WHERE reference_type='planning_events' AND reference_id=OLD.id; RETURN OLD; END IF;
  IF NEW.type='visite' AND NEW.user_id IS NOT NULL THEN
    SELECT * INTO r FROM fn_commission_rule('vt',NEW.user_id,NEW.produit_id,NEW.date);
    m_com:=COALESCE(NEW.commission_montant_commercial,r.montant_commercial,0);
    m_soc:=COALESCE(NEW.commission_montant_societe,r.montant_societe,0);
    INSERT INTO commissions(commercial_id,type,libelle,reference_type,reference_id,montant_commercial,montant_societe,statut)
    VALUES(NEW.user_id,'vt','Visite technique — '||COALESCE(NEW.titre,''),'planning_events',NEW.id,m_com,m_soc,'en_attente')
    ON CONFLICT(reference_type,reference_id) DO UPDATE SET commercial_id=EXCLUDED.commercial_id,montant_commercial=EXCLUDED.montant_commercial,montant_societe=EXCLUDED.montant_societe,libelle=EXCLUDED.libelle;
  ELSE DELETE FROM commissions WHERE reference_type='planning_events' AND reference_id=NEW.id; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_commission_vt ON planning_events;
CREATE TRIGGER trg_sync_commission_vt AFTER INSERT OR UPDATE OF type,user_id,produit_id,commission_montant_commercial,commission_montant_societe OR DELETE ON planning_events FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_vt();

CREATE OR REPLACE FUNCTION fn_sync_commission_devis_signe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r commission_bareme%ROWTYPE; v_com uuid; v_prod uuid; base numeric; m_com numeric; m_soc numeric;
BEGIN
  IF NEW.statut<>'signe' OR (TG_OP='UPDATE' AND OLD.statut='signe') THEN RETURN NEW; END IF;
  SELECT p.commercial_id INTO v_com FROM prospects p WHERE p.id=NEW.prospect_id;
  IF v_com IS NULL THEN RETURN NEW; END IF;
  SELECT dl.produit_id INTO v_prod FROM devis_lignes dl WHERE dl.devis_id=NEW.id ORDER BY dl.ordre LIMIT 1;
  SELECT * INTO r FROM fn_commission_rule('devis_signe',v_com,v_prod,COALESCE(NEW.date_creation::date,current_date));
  IF NOT FOUND THEN RETURN NEW; END IF;
  base:=CASE r.base_pourcentage WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge,0) WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc,0) ELSE COALESCE(NEW.montant_ht,0) END;
  m_com:=COALESCE(r.montant_commercial,0)+COALESCE(r.pourcentage_commercial,0)/100*base;
  m_soc:=COALESCE(r.montant_societe,0);
  INSERT INTO commissions(commercial_id,type,libelle,reference_type,reference_id,montant_commercial,montant_societe,statut)
  VALUES(v_com,'devis_signe','Devis signé — '||COALESCE(NEW.numero,''),'devis',NEW.id,m_com,m_soc,'en_attente')
  ON CONFLICT(reference_type,reference_id) DO UPDATE SET montant_commercial=EXCLUDED.montant_commercial,montant_societe=EXCLUDED.montant_societe;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON devis;
CREATE TRIGGER trg_sync_commission_devis_signe AFTER INSERT OR UPDATE OF statut ON devis FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_devis_signe();

CREATE OR REPLACE FUNCTION fn_audit_dossiers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO audit_logs(user_id,entity_type,entity_id,action,old_data,new_data) VALUES(auth.uid(),'dossier',COALESCE(NEW.id,OLD.id),TG_OP,to_jsonb(OLD),to_jsonb(NEW));
 RETURN COALESCE(NEW,OLD);
END; $$;
DROP TRIGGER IF EXISTS trg_audit_dossiers ON dossiers;
CREATE TRIGGER trg_audit_dossiers AFTER INSERT OR UPDATE OR DELETE ON dossiers FOR EACH ROW EXECUTE FUNCTION fn_audit_dossiers();

CREATE OR REPLACE FUNCTION fn_dossier_installation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.statut IN ('installation','installe') AND NEW.prospect_id IS NOT NULL THEN
   UPDATE prospects SET statut=CASE WHEN NEW.statut='installe' THEN 'Installé' ELSE 'Installation' END WHERE id=NEW.prospect_id;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_dossier_installation ON dossiers;
CREATE TRIGGER trg_dossier_installation AFTER INSERT OR UPDATE OF statut ON dossiers FOR EACH ROW EXECUTE FUNCTION fn_dossier_installation();
