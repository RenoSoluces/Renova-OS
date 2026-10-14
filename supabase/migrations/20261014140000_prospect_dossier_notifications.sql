-- Notifications internes pour les nouveaux prospects et les évolutions de statut des dossiers.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS authenticated_select_notifications ON public.notifications;
CREATE POLICY authenticated_select_notifications ON public.notifications FOR SELECT TO authenticated USING (
  recipient_id IS NULL OR recipient_id = auth.uid() OR public.is_admin_ou_manager()
);

CREATE OR REPLACE FUNCTION public.notify_admins_new_prospect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE admin_row record; nom_client text;
BEGIN
  nom_client := trim(coalesce(NEW.prenom,'') || ' ' || coalesce(NEW.nom,''));
  IF coalesce(NEW.raison_sociale,'') <> '' THEN nom_client := NEW.raison_sociale || ' — ' || nom_client; END IF;
  FOR admin_row IN SELECT id FROM public.profiles WHERE role IN ('admin','manager') LOOP
    INSERT INTO public.notifications(type,titre,message,prospect_id,recipient_id,meta)
    VALUES('nouveau_prospect','Nouveau prospect',coalesce(nullif(nom_client,''),'Un nouveau prospect') || ' vient d’être créé.',NEW.id,admin_row.id,jsonb_build_object('kind','nouveau_prospect','prospect_id',NEW.id));
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admins_new_prospect ON public.prospects;
CREATE TRIGGER trg_notify_admins_new_prospect AFTER INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_prospect();

CREATE OR REPLACE FUNCTION public.notify_commercial_dossier_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_commercial uuid; v_nom text;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN RETURN NEW; END IF;
  SELECT p.commercial_id, trim(coalesce(p.prenom,'') || ' ' || coalesce(p.nom,''))
    INTO v_commercial, v_nom FROM public.prospects p WHERE p.id=NEW.prospect_id;
  IF v_commercial IS NOT NULL THEN
    INSERT INTO public.notifications(type,titre,message,prospect_id,dossier_id,recipient_id,meta)
    VALUES('evolution_dossier','Évolution du dossier',coalesce(nullif(v_nom,''),'Le prospect') || ' : statut passé de « ' || coalesce(OLD.statut,'—') || ' » à « ' || coalesce(NEW.statut,'—') || ' ».',NEW.prospect_id,NEW.id,v_commercial,jsonb_build_object('kind','evolution_dossier','dossier_id',NEW.id,'ancien_statut',OLD.statut,'nouveau_statut',NEW.statut));
  ELSE
    INSERT INTO public.notifications(type,titre,message,prospect_id,dossier_id,recipient_id,meta)
    SELECT 'evolution_dossier','Évolution du dossier',coalesce(nullif(v_nom,''),'Le prospect') || ' : statut passé de « ' || coalesce(OLD.statut,'—') || ' » à « ' || coalesce(NEW.statut,'—') || ' ».',NEW.prospect_id,NEW.id,pr.id,jsonb_build_object('kind','evolution_dossier','dossier_id',NEW.id,'ancien_statut',OLD.statut,'nouveau_statut',NEW.statut)
    FROM public.profiles pr WHERE pr.role IN ('admin','manager');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_commercial_dossier_status ON public.dossiers;
CREATE TRIGGER trg_notify_commercial_dossier_status AFTER UPDATE OF statut ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.notify_commercial_dossier_status();
