/* Qualification administrative des visites techniques */
ALTER TABLE visites ADD COLUMN IF NOT EXISTS vt_produit_id uuid REFERENCES catalogue_produits(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS visite_id uuid REFERENCES visites(id) ON DELETE CASCADE, ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_visites_vt_produit ON visites(vt_produit_id);
CREATE INDEX IF NOT EXISTS idx_notifications_visite ON notifications(visite_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id,lue,created_at DESC);

CREATE OR REPLACE FUNCTION fn_sync_commission_vt_qualification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r commission_bareme%ROWTYPE; v_commercial uuid; m_com numeric; m_soc numeric;
BEGIN
 IF TG_OP='DELETE' THEN DELETE FROM commissions WHERE reference_type='visites' AND reference_id=OLD.id; DELETE FROM notifications WHERE visite_id=OLD.id; RETURN OLD; END IF;
 IF NEW.statut='terminee' AND NEW.vt_produit_id IS NOT NULL THEN
   SELECT p.commercial_id INTO v_commercial FROM prospects p WHERE p.id=NEW.prospect_id;
   IF v_commercial IS NULL THEN RETURN NEW; END IF;
   SELECT * INTO r FROM fn_commission_rule('vt',v_commercial,NEW.vt_produit_id,COALESCE(NEW.date_visite,current_date));
   IF NOT FOUND THEN RETURN NEW; END IF;
   m_com:=COALESCE(r.montant_commercial,0); m_soc:=COALESCE(r.montant_societe,0);
   INSERT INTO commissions(commercial_id,type,libelle,reference_type,reference_id,montant_commercial,montant_societe,statut) VALUES(v_commercial,'vt','Visite technique — '||COALESCE(NEW.date_visite::text,''),'visites',NEW.id,m_com,m_soc,'en_attente') ON CONFLICT(reference_type,reference_id) DO UPDATE SET commercial_id=EXCLUDED.commercial_id,libelle=EXCLUDED.libelle,montant_commercial=EXCLUDED.montant_commercial,montant_societe=EXCLUDED.montant_societe,statut=CASE WHEN commissions.statut='payee' THEN commissions.statut ELSE 'en_attente' END;
   UPDATE notifications SET lue=true WHERE visite_id=NEW.id AND type='vt_a_qualifier';
 ELSE DELETE FROM commissions WHERE reference_type='visites' AND reference_id=NEW.id; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_commission_vt_validation ON visites; DROP TRIGGER IF EXISTS trg_sync_commission_vt_qualification ON visites;
CREATE TRIGGER trg_sync_commission_vt_qualification AFTER INSERT OR UPDATE OF statut,vt_produit_id OR DELETE ON visites FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_vt_qualification();

CREATE OR REPLACE FUNCTION fn_notify_vt_terminee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; nom_client text;
BEGIN
 IF NEW.statut='terminee' AND (TG_OP='INSERT' OR OLD.statut IS DISTINCT FROM 'terminee') THEN
   SELECT COALESCE(pr.prenom||' '||pr.nom,'Client') INTO nom_client FROM prospects pr WHERE pr.id=NEW.prospect_id;
   FOR p IN SELECT id FROM profiles WHERE role IN ('admin','manager') LOOP
     IF NOT EXISTS(SELECT 1 FROM notifications n WHERE n.type='vt_a_qualifier' AND n.visite_id=NEW.id AND n.recipient_id=p.id) THEN
       INSERT INTO notifications(type,titre,message,prospect_id,visite_id,recipient_id,meta) VALUES('vt_a_qualifier','VT terminée à qualifier',nom_client||' a terminé sa visite technique. Sélectionnez le type de VT pour appliquer le bon barème.',NEW.prospect_id,NEW.id,p.id,jsonb_build_object('kind','vt_a_qualifier','visite_id',NEW.id));
     END IF;
   END LOOP;
 END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_notify_vt_terminee ON visites; CREATE TRIGGER trg_notify_vt_terminee AFTER INSERT OR UPDATE OF statut ON visites FOR EACH ROW EXECUTE FUNCTION fn_notify_vt_terminee();

DROP POLICY IF EXISTS "anon_delete_visites" ON visites; DROP POLICY IF EXISTS "visites_delete_admin" ON visites;
CREATE POLICY "visites_delete_admin" ON visites FOR DELETE TO authenticated USING(is_admin_ou_manager());

-- Le type de VT est une donnée administrative : un commercial ne peut pas la modifier.
CREATE OR REPLACE FUNCTION fn_guard_vt_produit_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.vt_produit_id IS DISTINCT FROM OLD.vt_produit_id AND NOT is_admin_ou_manager() THEN
    RAISE EXCEPTION 'Seule l''administration peut qualifier le type de visite technique';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_vt_produit_admin ON visites;
CREATE TRIGGER trg_guard_vt_produit_admin
BEFORE UPDATE OF vt_produit_id ON visites
FOR EACH ROW EXECUTE FUNCTION fn_guard_vt_produit_admin();
