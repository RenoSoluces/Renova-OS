-- Keep the destination guard limited to changes of the recipient organisation.
CREATE OR REPLACE FUNCTION public.set_multi_org_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  actor_org uuid;
BEGIN
  SELECT p.organisation_id INTO actor_org
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid());

  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.is_super_admin() THEN
    IF TG_TABLE_NAME = 'prospects' THEN
      IF TG_OP = 'UPDATE' THEN
        IF NEW.organisation_id IS DISTINCT FROM OLD.organisation_id THEN
          RAISE EXCEPTION 'Le partage ne transfère pas la propriété du prospect.';
        END IF;
        IF OLD.organisation_id IS DISTINCT FROM actor_org
          AND NEW.commercial_id IS DISTINCT FROM OLD.commercial_id
          AND EXISTS (
            SELECT 1 FROM public.prospect_shares s
            WHERE s.prospect_id = OLD.id AND s.organisation_id = actor_org
          ) THEN
          RAISE EXCEPTION 'Un prospect partagé conserve son attribution d’origine ; demandez au Grand Admin un changement de propriétaire.';
        END IF;
      ELSIF TG_OP = 'INSERT' THEN
        IF NEW.organisation_id IS NOT NULL AND NEW.organisation_id <> actor_org THEN
          RAISE EXCEPTION 'Un prospect doit appartenir à votre entreprise.';
        END IF;
      END IF;

    ELSIF TG_TABLE_NAME = 'dossiers' THEN
      IF NEW.organisation_id IS NOT NULL AND NEW.organisation_id IS DISTINCT FROM
        (SELECT p.organisation_id FROM public.prospects p WHERE p.id = NEW.prospect_id) THEN
        RAISE EXCEPTION 'L’entreprise propriétaire du dossier suit celle du prospect.';
      END IF;
      IF TG_OP = 'INSERT' THEN
        IF NEW.facturation_organisation_id IS NOT NULL
          AND NEW.facturation_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'La facturation doit être portée par votre entreprise.';
        END IF;
        IF NEW.destinataire_organisation_id IS NOT NULL
          AND NEW.destinataire_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'Vous ne pouvez sélectionner que votre entreprise comme destinataire ; contactez le Grand Admin pour un destinataire externe.';
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.facturation_organisation_id IS DISTINCT FROM OLD.facturation_organisation_id
          AND NEW.facturation_organisation_id IS NOT NULL
          AND NEW.facturation_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'La facturation doit être portée par votre entreprise.';
        END IF;
        IF NEW.destinataire_organisation_id IS DISTINCT FROM OLD.destinataire_organisation_id
          AND NEW.destinataire_organisation_id IS NOT NULL
          AND NEW.destinataire_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'Vous ne pouvez sélectionner que votre entreprise comme destinataire ; contactez le Grand Admin pour un destinataire externe.';
        END IF;
      END IF;

    ELSIF TG_TABLE_NAME = 'commissions' THEN
      IF NEW.organisation_id IS NOT NULL AND NEW.organisation_id <> actor_org THEN
        RAISE EXCEPTION 'Une commission ne peut être rattachée qu’à votre entreprise.';
      END IF;

    ELSIF TG_TABLE_NAME = 'dossier_facturation' THEN
      IF NEW.organisation_id IS NOT NULL AND NEW.organisation_id <> (
        SELECT d.facturation_organisation_id FROM public.dossiers d WHERE d.id = NEW.dossier_id
      ) THEN
        RAISE EXCEPTION 'La facture doit suivre l’entreprise de facturation du dossier.';
      END IF;
      IF TG_OP = 'INSERT' THEN
        IF NEW.destinataire_organisation_id IS NOT NULL
          AND NEW.destinataire_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'Vous ne pouvez sélectionner que votre entreprise comme destinataire.';
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.destinataire_organisation_id IS DISTINCT FROM OLD.destinataire_organisation_id
          AND NEW.destinataire_organisation_id IS NOT NULL
          AND NEW.destinataire_organisation_id <> actor_org THEN
          RAISE EXCEPTION 'Vous ne pouvez sélectionner que votre entreprise comme destinataire.';
        END IF;
      END IF;

    ELSIF TG_TABLE_NAME = 'factures_clients' THEN
      IF NEW.emetteur_organisation_id IS NOT NULL
        AND NEW.emetteur_organisation_id <> actor_org THEN
        RAISE EXCEPTION 'Vous ne pouvez facturer qu’au nom de votre entreprise.';
      END IF;

    ELSIF TG_TABLE_NAME = 'entreprises' THEN
      IF NEW.organisation_id IS NOT NULL AND NEW.organisation_id <> actor_org THEN
        RAISE EXCEPTION 'Vous ne pouvez modifier que les informations de votre entreprise.';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'prospects' THEN
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := COALESCE(
        (SELECT p.organisation_id FROM public.profiles p WHERE p.id = NEW.commercial_id),
        actor_org,
        (SELECT id FROM public.organisations WHERE nom = 'Reno Soluces')
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'dossiers' THEN
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := (
        SELECT p.organisation_id FROM public.prospects p WHERE p.id = NEW.prospect_id
      );
    END IF;
    IF NEW.facturation_organisation_id IS NULL THEN
      NEW.facturation_organisation_id := CASE
        WHEN public.is_super_admin() THEN NEW.organisation_id
        ELSE COALESCE(actor_org, NEW.organisation_id)
      END;
    END IF;

  ELSIF TG_TABLE_NAME = 'commissions' THEN
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := COALESCE(
        (SELECT p.organisation_id FROM public.profiles p WHERE p.id = NEW.commercial_id),
        actor_org,
        (SELECT id FROM public.organisations WHERE nom = 'Reno Soluces')
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'dossier_facturation' THEN
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := (
        SELECT d.facturation_organisation_id FROM public.dossiers d WHERE d.id = NEW.dossier_id
      );
    END IF;
    IF NEW.destinataire_organisation_id IS NULL THEN
      NEW.destinataire_organisation_id := (
        SELECT d.destinataire_organisation_id FROM public.dossiers d WHERE d.id = NEW.dossier_id
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'entreprises' THEN
    IF NEW.organisation_id IS NULL THEN
      NEW.organisation_id := COALESCE(
        actor_org,
        (SELECT id FROM public.organisations WHERE nom = 'Reno Soluces')
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'factures_clients' THEN
    IF NEW.emetteur_organisation_id IS NULL THEN
      NEW.emetteur_organisation_id := COALESCE(
        actor_org,
        (SELECT p.organisation_id FROM public.prospects p WHERE p.id = NEW.prospect_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_multi_org_defaults() FROM PUBLIC, anon;
