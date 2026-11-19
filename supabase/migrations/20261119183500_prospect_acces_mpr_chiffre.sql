-- Accès MaPrimeRénov du client, mot de passe chiffré (clé dans le Vault, jamais exposée au client).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cle_acces_mpr') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'cle_acces_mpr', 'Clé de chiffrement des accès MaPrimeRénov des prospects');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.prospect_acces_mpr (
  prospect_id uuid PRIMARY KEY REFERENCES public.prospects(id) ON DELETE CASCADE,
  identifiant text,
  mot_de_passe_chiffre bytea,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.prospect_acces_mpr ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospect_acces_mpr FROM anon, authenticated;
COMMENT ON TABLE public.prospect_acces_mpr IS 'Accès MaPrimeRénov du client. Aucun accès direct : lecture/écriture uniquement par les fonctions definir_acces_mpr / lire_acces_mpr.';

CREATE OR REPLACE FUNCTION public.definir_acces_mpr(p_prospect_id uuid, p_identifiant text, p_mot_de_passe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE cle text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.prospect_visible(p_prospect_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT decrypted_secret INTO cle FROM vault.decrypted_secrets WHERE name = 'cle_acces_mpr';
  INSERT INTO public.prospect_acces_mpr (prospect_id, identifiant, mot_de_passe_chiffre, updated_at, updated_by)
  VALUES (p_prospect_id, NULLIF(trim(p_identifiant), ''),
          CASE WHEN COALESCE(p_mot_de_passe, '') = '' THEN NULL ELSE pgp_sym_encrypt(p_mot_de_passe, cle) END,
          now(), auth.uid())
  ON CONFLICT (prospect_id) DO UPDATE
    SET identifiant = EXCLUDED.identifiant,
        mot_de_passe_chiffre = EXCLUDED.mot_de_passe_chiffre,
        updated_at = now(), updated_by = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.lire_acces_mpr(p_prospect_id uuid)
RETURNS TABLE(identifiant text, mot_de_passe text, updated_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE cle text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.prospect_visible(p_prospect_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT decrypted_secret INTO cle FROM vault.decrypted_secrets WHERE name = 'cle_acces_mpr';
  RETURN QUERY
    SELECT a.identifiant,
           CASE WHEN a.mot_de_passe_chiffre IS NULL THEN NULL ELSE pgp_sym_decrypt(a.mot_de_passe_chiffre, cle) END,
           a.updated_at
    FROM public.prospect_acces_mpr a WHERE a.prospect_id = p_prospect_id;
END $$;

REVOKE ALL ON FUNCTION public.definir_acces_mpr(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lire_acces_mpr(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_acces_mpr(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lire_acces_mpr(uuid) TO authenticated;
