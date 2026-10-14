-- Numérotation séquentielle des devis par mois et correction robuste de la numérotation des factures.
-- Format devis : DEV-AAAA-MM-NNNN. Le compteur est atomique et distinct pour chaque mois.
CREATE TABLE IF NOT EXISTS public.devis_compteurs_mensuels (
  periode text PRIMARY KEY CHECK (periode ~ '^[0-9]{6}$'),
  dernier_numero bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.devis_compteurs_mensuels ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_attribuer_numero_devis_sequentiel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_periode text := to_char(CURRENT_DATE, 'YYYYMM'); v_compteur bigint;
BEGIN
  IF NEW.devis_parent_id IS NOT NULL OR COALESCE(NEW.numero, '') ~ '-AV[0-9]+$' THEN RETURN NEW; END IF;
  INSERT INTO public.devis_compteurs_mensuels(periode, dernier_numero) VALUES (v_periode, 1)
  ON CONFLICT (periode) DO UPDATE SET dernier_numero = public.devis_compteurs_mensuels.dernier_numero + 1
  RETURNING dernier_numero INTO v_compteur;
  NEW.numero := 'DEV-' || substr(v_periode,1,4) || '-' || substr(v_periode,5,2) || '-' || lpad(v_compteur::text,4,'0');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_attribuer_numero_devis_sequentiel ON public.devis;
CREATE TRIGGER trg_attribuer_numero_devis_sequentiel BEFORE INSERT ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.fn_attribuer_numero_devis_sequentiel();

CREATE SEQUENCE IF NOT EXISTS public.facture_numero_seq START WITH 1;
CREATE OR REPLACE FUNCTION public.next_facture_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise pour numéroter une facture'; END IF;
  IF NOT public.is_admin_ou_manager() THEN RAISE EXCEPTION 'La génération des factures est réservée à l’administration'; END IF;
  n := nextval('public.facture_numero_seq');
  RETURN 'FAC-' || to_char(current_date,'YYYY') || '-' || lpad(n::text,6,'0');
END; $$;
GRANT EXECUTE ON FUNCTION public.next_facture_number() TO authenticated;

-- Catégories créées par l'administration, séparées par public cible.
CREATE TABLE IF NOT EXISTS public.catalogue_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  public_cible text NOT NULL CHECK (public_cible IN ('particulier','professionnel')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalogue_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalogue_categories_read ON public.catalogue_categories;
CREATE POLICY catalogue_categories_read ON public.catalogue_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS catalogue_categories_admin_write ON public.catalogue_categories;
CREATE POLICY catalogue_categories_admin_write ON public.catalogue_categories FOR ALL TO authenticated USING (public.is_admin_ou_manager()) WITH CHECK (public.is_admin_ou_manager());

-- Correction de l'adresse de référence d'IDEHOME, y compris les fiches partenaires existantes.
UPDATE public.installateurs SET adresse='8 Rue Mermoz', code_postal='34430', ville='Saint-Jean-de-Védas' WHERE lower(nom) LIKE '%idehome%';
UPDATE public.installateurs SET adresse='8 Rue Mermoz', code_postal='34430', ville='Saint-Jean-de-Védas' WHERE lower(coalesce(devis_nom_affichage,'')) LIKE '%idehome%' OR lower(coalesce(devis_raison_sociale,'')) LIKE '%idehome%';
