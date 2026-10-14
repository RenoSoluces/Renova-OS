-- Numérotation séquentielle des nouveaux devis, attribuée en base pour éviter
-- les doublons en cas de créations simultanées depuis plusieurs sessions.
-- Les devis historiques ne sont pas renumérotés. Les avenants conservent leur suffixe.

CREATE SEQUENCE IF NOT EXISTS public.devis_numero_seq;

DO $$
DECLARE
  v_max bigint;
BEGIN
  -- Reprend le plus grand compteur déjà utilisé avec le nouveau format DEV-AAAA-NNNNN.
  SELECT MAX((substring(numero FROM '-([0-9]+)$'))::bigint)
    INTO v_max
    FROM public.devis
   WHERE numero ~ '^DEV-[0-9]{4}-[0-9]+$';

  IF COALESCE(v_max, 0) > 0 THEN
    PERFORM setval('public.devis_numero_seq', v_max, true);
  ELSE
    PERFORM setval('public.devis_numero_seq', 1, false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_attribuer_numero_devis_sequentiel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_annee text := to_char(CURRENT_DATE, 'YYYY');
  v_compteur bigint;
BEGIN
  -- Ne pas remplacer les numéros d'avenants (DEV-...-AV1, AV2, etc.).
  IF NEW.devis_parent_id IS NOT NULL OR COALESCE(NEW.numero, '') ~ '-AV[0-9]+$' THEN
    RETURN NEW;
  END IF;

  v_compteur := nextval('public.devis_numero_seq');
  NEW.numero := 'DEV-' || v_annee || '-' || lpad(v_compteur::text, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attribuer_numero_devis_sequentiel ON public.devis;
CREATE TRIGGER trg_attribuer_numero_devis_sequentiel
BEFORE INSERT ON public.devis
FOR EACH ROW
EXECUTE FUNCTION public.fn_attribuer_numero_devis_sequentiel();
