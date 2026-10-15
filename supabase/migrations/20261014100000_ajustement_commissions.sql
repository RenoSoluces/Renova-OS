
CREATE TABLE IF NOT EXISTS public.commission_ajustements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE RESTRICT,
  auteur_id uuid NOT NULL REFERENCES auth.users(id),
  montant_commercial_avant numeric(12,2) NOT NULL,
  montant_commercial_apres numeric(12,2) NOT NULL,
  montant_societe_avant numeric(12,2) NOT NULL,
  montant_societe_apres numeric(12,2) NOT NULL,
  motif text NOT NULL CHECK (length(trim(motif)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_ajustements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_ajustements_select_admin"
ON public.commission_ajustements
FOR SELECT TO authenticated
USING (public.is_admin_ou_manager());

CREATE OR REPLACE FUNCTION public.ajuster_commission(
  p_commission_id uuid,
  p_montant_commercial numeric,
  p_montant_societe numeric,
  p_motif text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.commissions%ROWTYPE;
BEGIN
  IF NOT public.is_admin_ou_manager() THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs et managers';
  END IF;

  IF p_montant_commercial IS NULL OR p_montant_commercial < 0
     OR p_montant_societe IS NULL OR p_montant_societe < 0 THEN
    RAISE EXCEPTION 'Les montants doivent être positifs ou nuls';
  END IF;

  IF p_motif IS NULL OR length(trim(p_motif)) = 0 THEN
    RAISE EXCEPTION 'Le motif est obligatoire';
  END IF;

  SELECT * INTO c
  FROM public.commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission introuvable';
  END IF;

  INSERT INTO public.commission_ajustements (
    commission_id,
    auteur_id,
    montant_commercial_avant,
    montant_commercial_apres,
    montant_societe_avant,
    montant_societe_apres,
    motif
  ) VALUES (
    c.id,
    auth.uid(),
    c.montant_commercial,
    p_montant_commercial,
    c.montant_societe,
    p_montant_societe,
    trim(p_motif)
  );

  UPDATE public.commissions
  SET montant_commercial = p_montant_commercial,
      montant_societe = p_montant_societe
  WHERE id = c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.ajuster_commission(uuid, numeric, numeric, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ajuster_commission(uuid, numeric, numeric, text)
TO authenticated;
