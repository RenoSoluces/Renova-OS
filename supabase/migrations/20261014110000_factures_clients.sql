-- Facturation des clients à partir d'un devis signé : acompte, démarrage et solde.
CREATE TABLE IF NOT EXISTS public.factures_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE RESTRICT,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
  numero text NOT NULL UNIQUE,
  type_facture text NOT NULL CHECK (type_facture IN ('acompte','demarrage','solde','autre')),
  libelle text NOT NULL DEFAULT 'Prestation de rénovation énergétique',
  montant_ht numeric(12,2) NOT NULL CHECK (montant_ht >= 0),
  montant_tva numeric(12,2) NOT NULL DEFAULT 0,
  montant_ttc numeric(12,2) NOT NULL DEFAULT 0,
  taux_tva numeric(5,2) NOT NULL DEFAULT 10,
  statut text NOT NULL DEFAULT 'emise' CHECK (statut IN ('emise','payee','annulee')),
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  date_echeance date,
  pdf_storage_path text,
  email_envoye_at timestamptz,
  email_erreur text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factures_clients_devis ON public.factures_clients(devis_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_factures_clients_prospect ON public.factures_clients(prospect_id, created_at DESC);
ALTER TABLE public.factures_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS factures_clients_select_scope ON public.factures_clients;
CREATE POLICY factures_clients_select_scope ON public.factures_clients FOR SELECT TO authenticated USING (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=factures_clients.prospect_id AND p.commercial_id=auth.uid())
);
DROP POLICY IF EXISTS factures_clients_write_scope ON public.factures_clients;
CREATE POLICY factures_clients_write_scope ON public.factures_clients FOR ALL TO authenticated USING (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=factures_clients.prospect_id AND p.commercial_id=auth.uid())
) WITH CHECK (
  public.is_admin_ou_manager() OR EXISTS (SELECT 1 FROM public.prospects p WHERE p.id=factures_clients.prospect_id AND p.commercial_id=auth.uid())
);
CREATE SEQUENCE IF NOT EXISTS public.facture_client_numero_seq START WITH 1;
CREATE OR REPLACE FUNCTION public.next_client_invoice_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF NOT public.is_admin_ou_manager() THEN RAISE EXCEPTION 'La création des factures clients est réservée à l’administration'; END IF;
  n := nextval('public.facture_client_numero_seq');
  RETURN 'FCL-' || to_char(current_date,'YYYY') || '-' || lpad(n::text,6,'0');
END; $$;
GRANT EXECUTE ON FUNCTION public.next_client_invoice_number() TO authenticated;


CREATE TABLE IF NOT EXISTS public.factures_clients_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES public.factures_clients(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  quantite numeric(12,3) NOT NULL DEFAULT 1,
  prix_unitaire_ht numeric(12,2) NOT NULL DEFAULT 0,
  taux_tva numeric(5,2) NOT NULL DEFAULT 10,
  montant_ht numeric(12,2) NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factures_clients_lignes_facture ON public.factures_clients_lignes(facture_id, ordre);
ALTER TABLE public.factures_clients_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS factures_clients_lignes_scope ON public.factures_clients_lignes;
CREATE POLICY factures_clients_lignes_scope ON public.factures_clients_lignes FOR ALL TO authenticated USING (
  public.is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM public.factures_clients fc JOIN public.prospects p ON p.id=fc.prospect_id
    WHERE fc.id=factures_clients_lignes.facture_id AND p.commercial_id=auth.uid()
  )
) WITH CHECK (
  public.is_admin_ou_manager() OR EXISTS (
    SELECT 1 FROM public.factures_clients fc JOIN public.prospects p ON p.id=fc.prospect_id
    WHERE fc.id=factures_clients_lignes.facture_id AND p.commercial_id=auth.uid()
  )
);
