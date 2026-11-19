-- Notify the assigned commercial whenever a prospect conversation receives a message.
CREATE OR REPLACE FUNCTION public.notify_prospect_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prospect_row record;
  sender_name text;
  recipient_user uuid;
BEGIN
  SELECT id, prenom, nom, commercial_id
    INTO prospect_row
    FROM public.prospects
   WHERE id = NEW.prospect_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(nom_complet, ''), email, 'Un utilisateur')
    INTO sender_name
    FROM public.profiles
   WHERE id = NEW.sender_id;

  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications(type, titre, message, prospect_id, recipient_id, meta)
    VALUES (
      'message_prospect',
      'Nouveau message dans une conversation',
      coalesce(sender_name, 'Un utilisateur') || ' vous a envoyé un message concernant ' ||
        trim(coalesce(prospect_row.prenom, '') || ' ' || coalesce(prospect_row.nom, '')) || '.',
      NEW.prospect_id,
      NEW.recipient_id,
      jsonb_build_object('kind', 'message_prospect', 'message_id', NEW.id)
    );
  END IF;

  recipient_user := prospect_row.commercial_id;
  IF recipient_user IS NOT NULL
     AND recipient_user <> NEW.sender_id
     AND recipient_user IS DISTINCT FROM NEW.recipient_id THEN
    INSERT INTO public.notifications(type, titre, message, prospect_id, recipient_id, meta)
    VALUES (
      'message_prospect',
      'Nouveau message sur un prospect attribué',
      coalesce(sender_name, 'Un utilisateur') || ' a envoyé un message concernant ' ||
        trim(coalesce(prospect_row.prenom, '') || ' ' || coalesce(prospect_row.nom, '')) || '.',
      NEW.prospect_id,
      recipient_user,
      jsonb_build_object('kind', 'message_prospect', 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_prospect_message ON public.prospect_messages;
CREATE TRIGGER trg_notify_prospect_message
AFTER INSERT ON public.prospect_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_prospect_message();
