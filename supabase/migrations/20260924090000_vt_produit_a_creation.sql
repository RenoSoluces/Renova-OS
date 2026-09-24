/*
  Le produit de la VT est choisi au moment de la création de la visite.
  La qualification administrative ne sert pas à déterminer le produit.

  - Le commercial choisit le produit du catalogue lors de "Nouvelle visite".
  - vt_produit_id est donc renseigné dès la création.
  - La commission reste déclenchée uniquement à la validation (statut = terminee).
  - La notification Admin signale simplement qu'une VT est terminée et ouvre la visite.
*/

CREATE OR REPLACE FUNCTION fn_notify_vt_terminee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  nom_client text;
BEGIN
  IF NEW.statut = 'terminee' AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'terminee') THEN
    SELECT COALESCE(pr.prenom || ' ' || pr.nom, 'Client')
      INTO nom_client
      FROM prospects pr
     WHERE pr.id = NEW.prospect_id;

    FOR p IN SELECT id FROM profiles WHERE role IN ('admin', 'manager') LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM notifications n
         WHERE n.type = 'vt_a_qualifier'
           AND n.visite_id = NEW.id
           AND n.recipient_id = p.id
           AND n.lue = false
      ) THEN
        INSERT INTO notifications(
          type, titre, message, prospect_id, visite_id, recipient_id, meta
        ) VALUES (
          'vt_a_qualifier',
          'Visite technique terminée',
          nom_client || ' a terminé sa visite technique. Cliquez pour ouvrir la visite.',
          NEW.prospect_id,
          NEW.id,
          p.id,
          jsonb_build_object('kind', 'vt_terminee', 'visite_id', NEW.id)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_vt_terminee ON visites;
CREATE TRIGGER trg_notify_vt_terminee
AFTER INSERT OR UPDATE OF statut ON visites
FOR EACH ROW EXECUTE FUNCTION fn_notify_vt_terminee();
