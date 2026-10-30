-- Un client peut avoir plusieurs dossiers (un par devis signé), chacun posé par un installateur différent
-- (ex. PAC air/eau par Novasol, puis PAC air/air par Idehome). L'installateur est donc porté par le dossier :
-- à la création, on reprend celui qui émet le devis, sinon celui de la fiche prospect (installateur par défaut).

CREATE OR REPLACE FUNCTION public.fn_dossier_installateur_par_defaut()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.installateur_id IS NULL THEN
    SELECT COALESCE(
      (SELECT d.emetteur_installateur_id FROM public.devis d WHERE d.id = NEW.devis_id),
      (SELECT p.installateur_id FROM public.prospects p WHERE p.id = NEW.prospect_id)
    ) INTO NEW.installateur_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_dossier_installateur_par_defaut() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_dossier_installateur_par_defaut ON public.dossiers;
CREATE TRIGGER trg_dossier_installateur_par_defaut
  BEFORE INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.fn_dossier_installateur_par_defaut();

-- Reprise des dossiers existants sans installateur.
UPDATE public.dossiers ds
SET installateur_id = COALESCE(
  (SELECT dv.emetteur_installateur_id FROM public.devis dv WHERE dv.id = ds.devis_id),
  (SELECT p.installateur_id FROM public.prospects p WHERE p.id = ds.prospect_id)
)
WHERE ds.installateur_id IS NULL;
