/* RENOVA OS V28 — fiabilisation métier, journalisation et santé système */

-- 1) Journal métier automatique : toute évolution importante laisse une trace.
CREATE OR REPLACE FUNCTION renova_log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity text := TG_TABLE_NAME;
  entity_id uuid;
  old_status text;
  new_status text;
  desc_txt text;
BEGIN
  entity_id := COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END), NULL);
  old_status := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD)->>'statut' ELSE NULL END;
  new_status := CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW)->>'statut' ELSE NULL END;

  IF TG_OP = 'INSERT' THEN
    desc_txt := format('%s créé', entity);
  ELSIF TG_OP = 'DELETE' THEN
    desc_txt := format('%s supprimé', entity);
  ELSE
    desc_txt := format('%s modifié', entity);
    IF old_status IS DISTINCT FROM new_status AND new_status IS NOT NULL THEN
      desc_txt := format('%s — statut %s → %s', entity, COALESCE(old_status,'—'), new_status);
    END IF;
  END IF;

  INSERT INTO system_activity_log(action, entity_type, entity_id, description, actor_id, meta)
  VALUES (
    lower(TG_OP) || '_' || entity,
    CASE entity WHEN 'prospects' THEN 'prospect' WHEN 'visites' THEN 'visite' WHEN 'devis' THEN 'devis' WHEN 'dossiers' THEN 'dossier' WHEN 'commissions' THEN 'commission' ELSE 'system' END,
    entity_id,
    desc_txt,
    auth.uid(),
    jsonb_build_object('table', entity, 'operation', TG_OP, 'old_status', old_status, 'new_status', new_status)
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  -- Le journal ne doit jamais bloquer une opération métier.
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['prospects','visites','devis','dossiers','commissions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_renova_audit_%s ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_renova_audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION renova_log_row_change()', t, t);
  END LOOP;
END $$;

-- 2) Fonction centralisée pour les changements de statut prospect.
CREATE OR REPLACE FUNCTION renova_set_prospect_status(p_prospect_id uuid, p_status text)
RETURNS prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r prospects;
BEGIN
  IF NOT (is_admin_ou_manager() OR EXISTS (SELECT 1 FROM prospects p WHERE p.id = p_prospect_id AND p.commercial_id = auth.uid())) THEN
    RAISE EXCEPTION 'Accès refusé à ce prospect';
  END IF;
  IF p_status IS NULL OR trim(p_status) = '' THEN RAISE EXCEPTION 'Statut prospect invalide'; END IF;
  UPDATE prospects SET statut = trim(p_status), derniere_interaction_at = now() WHERE id = p_prospect_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prospect introuvable'; END IF;
  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION renova_set_prospect_status(uuid,text) TO authenticated;

-- 3) Notifications : un message ciblé ne doit être visible que par son destinataire
-- (les notifications globales sans prospect restent partagées).
DROP POLICY IF EXISTS "notifications_select_scope" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_scope" ON notifications;
DROP POLICY IF EXISTS "notifications_update_scope" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_scope" ON notifications;

CREATE POLICY "notifications_select_scope" ON notifications FOR SELECT TO authenticated
USING (
  (recipient_id IS NOT NULL AND recipient_id = auth.uid())
  OR (recipient_id IS NULL AND (prospect_id IS NULL OR prospect_visible(prospect_id)))
  OR is_admin_ou_manager()
);
CREATE POLICY "notifications_insert_scope" ON notifications FOR INSERT TO authenticated
WITH CHECK (recipient_id IS NULL OR recipient_id = auth.uid() OR is_admin_ou_manager());
CREATE POLICY "notifications_update_scope" ON notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid() OR recipient_id IS NULL AND (prospect_id IS NULL OR prospect_visible(prospect_id)) OR is_admin_ou_manager())
WITH CHECK (recipient_id = auth.uid() OR recipient_id IS NULL OR is_admin_ou_manager());
CREATE POLICY "notifications_delete_scope" ON notifications FOR DELETE TO authenticated
USING (recipient_id = auth.uid() OR recipient_id IS NULL AND (prospect_id IS NULL OR prospect_visible(prospect_id)) OR is_admin_ou_manager());

-- 4) Vue de contrôle exploitable par l'écran Santé du système.
CREATE OR REPLACE VIEW renova_system_health AS
SELECT
  (SELECT count(*) FROM visites WHERE statut = 'terminee' AND vt_produit_id IS NULL) AS vt_a_qualifier,
  (SELECT count(*) FROM commissions WHERE statut <> 'annulee' AND COALESCE(montant_commercial,0) = 0 AND COALESCE(montant_societe,0) = 0) AS commissions_zero,
  (SELECT count(*) FROM dossiers d WHERE lower(coalesce(d.statut,'')) IN ('installe','installation') AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.reference_type='devis' AND c.reference_id=d.devis_id AND c.statut <> 'annulee')) AS dossiers_sans_commission,
  (SELECT count(*) FROM devis WHERE statut = 'envoye' AND created_at < now() - interval '5 days') AS devis_a_relancer,
  (SELECT count(*) FROM tasks WHERE done = false AND due_at < now()) AS taches_en_retard,
  (SELECT count(*) FROM documents WHERE url IS NULL OR trim(coalesce(url,'')) = '') AS documents_sans_fichier,
  (SELECT count(*) FROM prospects WHERE commercial_id IS NULL AND COALESCE(pot_commun,false) = false) AS prospects_sans_attribution;

GRANT SELECT ON renova_system_health TO authenticated;
