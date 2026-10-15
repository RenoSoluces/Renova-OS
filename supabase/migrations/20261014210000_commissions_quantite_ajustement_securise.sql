-- RENOVA OS — commissions multi-quantités, édition sécurisée
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_sync_commission_devis_signe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r public.commission_bareme%ROWTYPE;
  v_com uuid;
  v_ligne record;
  v_quantite numeric;
  v_base numeric := 0;
  v_m_com numeric := 0;
  v_m_soc numeric := 0;
  v_pourcentage numeric := 0;
  v_pourcentage_calcule boolean := false;
  v_generic_applied boolean := false;
  v_has_line boolean := false;
BEGIN
  IF NEW.statut IS DISTINCT FROM 'signe' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'signe' THEN
    RETURN NEW;
  END IF;

  SELECT p.commercial_id INTO v_com
  FROM public.prospects p
  WHERE p.id = NEW.prospect_id;
  IF v_com IS NULL THEN RETURN NEW; END IF;

  FOR v_ligne IN
    SELECT dl.produit_id, GREATEST(COALESCE(dl.quantite, 1), 0) AS quantite
    FROM public.devis_lignes dl
    WHERE dl.devis_id = NEW.id AND dl.produit_id IS NOT NULL
    ORDER BY dl.ordre, dl.id
  LOOP
    v_has_line := true;
    v_quantite := v_ligne.quantite;

    SELECT * INTO r
    FROM public.fn_commission_rule(
      'devis_signe', v_com, v_ligne.produit_id,
      COALESCE(NEW.date_creation::date, CURRENT_DATE)
    );
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Un barème générique n'est appliqué qu'une fois par devis.
    IF r.produit_id IS NULL THEN
      IF v_generic_applied THEN CONTINUE; END IF;
      v_generic_applied := true;
    END IF;

    -- Le mode pourcentage n'ajoute pas de montant fixe commercial.
    IF r.mode <> 'pourcentage' THEN
      IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' THEN
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0) * v_quantite;
      ELSE
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0);
      END IF;
    END IF;

    -- Les montants société liés à un produit sont également unitaires.
    IF r.produit_id IS NOT NULL OR r.mode = 'par_m2' THEN
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0) * v_quantite;
    ELSE
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0);
    END IF;

    -- Le pourcentage est appliqué une seule fois sur la base du devis entier.
    IF NOT v_pourcentage_calcule
       AND COALESCE(r.pourcentage_commercial, 0) <> 0 THEN
      v_base := CASE r.base_pourcentage
        WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
        WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
        ELSE COALESCE(NEW.montant_ht, 0)
      END;
      v_pourcentage := COALESCE(r.pourcentage_commercial, 0) / 100 * v_base;
      v_pourcentage_calcule := true;
    END IF;
  END LOOP;

  -- Sans ligne produit, on applique une seule règle générique au devis.
  IF NOT v_has_line THEN
    SELECT * INTO r
    FROM public.fn_commission_rule(
      'devis_signe', v_com, NULL,
      COALESCE(NEW.date_creation::date, CURRENT_DATE)
    );
    IF FOUND THEN
      IF r.mode <> 'pourcentage' THEN
        v_m_com := v_m_com + COALESCE(r.montant_commercial, 0);
      END IF;
      v_m_soc := v_m_soc + COALESCE(r.montant_societe, 0);
      IF COALESCE(r.pourcentage_commercial, 0) <> 0 THEN
        v_base := CASE r.base_pourcentage
          WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
          WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
          ELSE COALESCE(NEW.montant_ht, 0)
        END;
        v_pourcentage := COALESCE(r.pourcentage_commercial, 0) / 100 * v_base;
      END IF;
    END IF;
  END IF;

  v_m_com := ROUND(v_m_com + v_pourcentage, 2);
  v_m_soc := ROUND(v_m_soc, 2);

  INSERT INTO public.commissions AS current_commission (
    commercial_id, type, libelle, reference_type, reference_id,
    montant_commercial, montant_societe, statut
  )
  VALUES (
    v_com, 'devis_signe', 'Devis signé — ' || COALESCE(NEW.numero, ''),
    'devis', NEW.id, v_m_com, v_m_soc, 'en_attente'
  )
  ON CONFLICT (reference_type, reference_id)
  DO UPDATE SET
    commercial_id = EXCLUDED.commercial_id,
    libelle = EXCLUDED.libelle,
    montant_commercial = EXCLUDED.montant_commercial,
    montant_societe = EXCLUDED.montant_societe
  WHERE current_commission.statut = 'en_attente'
    AND current_commission.date_paiement_commercial IS NULL
    AND current_commission.date_paiement_societe IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.commission_echeances ce
      WHERE ce.commission_id = current_commission.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.commission_ajustements ca
      WHERE ca.commission_id = current_commission.id
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON public.devis;
CREATE TRIGGER trg_sync_commission_devis_signe
AFTER INSERT OR UPDATE OF statut ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_commission_devis_signe();

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
DROP POLICY IF EXISTS commission_ajustements_select_admin ON public.commission_ajustements;
DROP POLICY IF EXISTS "commission_ajustements_select_admin" ON public.commission_ajustements;
CREATE POLICY commission_ajustements_select_admin
  ON public.commission_ajustements FOR SELECT TO authenticated
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
AS $function$
DECLARE
  c public.commissions%ROWTYPE;
  b record;
  e record;
  v_has_schedules boolean;
  v_paid numeric(12,2);
  v_unpaid numeric(12,2);
  v_target_unpaid numeric(12,2);
  v_delta numeric(12,2);
  v_to_reduce numeric(12,2);
  v_reduce numeric(12,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_ou_manager() THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs et managers.';
  END IF;
  IF p_commission_id IS NULL THEN RAISE EXCEPTION 'Identifiant de commission manquant.'; END IF;
  IF p_montant_commercial IS NULL OR p_montant_societe IS NULL
     OR p_montant_commercial < 0 OR p_montant_societe < 0 THEN
    RAISE EXCEPTION 'Les montants doivent être positifs ou nuls.';
  END IF;
  IF NULLIF(BTRIM(p_motif), '') IS NULL THEN
    RAISE EXCEPTION 'Le motif de correction est obligatoire.';
  END IF;

  SELECT * INTO c FROM public.commissions WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission introuvable.'; END IF;

  FOR b IN
    SELECT * FROM (VALUES
      ('commercial'::text, ROUND(p_montant_commercial, 2), COALESCE(c.montant_commercial, 0), c.date_paiement_commercial),
      ('societe'::text, ROUND(p_montant_societe, 2), COALESCE(c.montant_societe, 0), c.date_paiement_societe)
    ) AS x(beneficiaire, nouveau_total, ancien_total, date_paiement)
  LOOP
    SELECT
      EXISTS (
        SELECT 1 FROM public.commission_echeances ce
        WHERE ce.commission_id = c.id AND ce.beneficiaire = b.beneficiaire
      ),
      ROUND(COALESCE(SUM(ce.montant) FILTER (WHERE ce.date_paiement IS NOT NULL), 0), 2),
      ROUND(COALESCE(SUM(ce.montant) FILTER (WHERE ce.date_paiement IS NULL), 0), 2)
    INTO v_has_schedules, v_paid, v_unpaid
    FROM public.commission_echeances ce
    WHERE ce.commission_id = c.id AND ce.beneficiaire = b.beneficiaire;

    -- Reprendre les anciens paiements qui n'ont pas encore d'échéancier.
    IF NOT v_has_schedules AND b.date_paiement IS NOT NULL THEN
      v_paid := ROUND(b.ancien_total, 2);
    END IF;

    IF v_paid > b.nouveau_total THEN
      RAISE EXCEPTION 'Correction impossible pour %. Déjà payé : % €, nouveau total : % €.',
        b.beneficiaire, v_paid, b.nouveau_total;
    END IF;

    IF v_has_schedules THEN
      v_target_unpaid := ROUND(b.nouveau_total - v_paid, 2);
      v_delta := ROUND(v_target_unpaid - v_unpaid, 2);

      IF v_delta > 0 THEN
        SELECT ce.id INTO e
        FROM public.commission_echeances ce
        WHERE ce.commission_id = c.id
          AND ce.beneficiaire = b.beneficiaire
          AND ce.date_paiement IS NULL
        ORDER BY ce.ordre DESC, ce.created_at DESC, ce.id DESC
        LIMIT 1 FOR UPDATE;

        IF FOUND THEN
          UPDATE public.commission_echeances
          SET montant = ROUND(montant + v_delta, 2)
          WHERE id = e.id;
        ELSE
          INSERT INTO public.commission_echeances (
            commission_id, beneficiaire, libelle, montant, date_prevue, date_paiement, ordre
          ) VALUES (
            c.id, b.beneficiaire, 'Complément après correction administrative',
            v_delta, NULL, NULL,
            COALESCE((
              SELECT MAX(ce.ordre) + 1 FROM public.commission_echeances ce
              WHERE ce.commission_id = c.id AND ce.beneficiaire = b.beneficiaire
            ), 0)
          );
        END IF;
      ELSIF v_delta < 0 THEN
        v_to_reduce := ABS(v_delta);
        FOR e IN
          SELECT ce.id, ce.montant
          FROM public.commission_echeances ce
          WHERE ce.commission_id = c.id
            AND ce.beneficiaire = b.beneficiaire
            AND ce.date_paiement IS NULL
          ORDER BY ce.ordre DESC, ce.created_at DESC, ce.id DESC
          FOR UPDATE
        LOOP
          EXIT WHEN v_to_reduce <= 0;
          v_reduce := LEAST(COALESCE(e.montant, 0), v_to_reduce);
          UPDATE public.commission_echeances
          SET montant = ROUND(montant - v_reduce, 2)
          WHERE id = e.id;
          v_to_reduce := ROUND(v_to_reduce - v_reduce, 2);
        END LOOP;
        IF v_to_reduce > 0 THEN
          RAISE EXCEPTION 'Impossible de répartir la correction dans les échéances non payées.';
        END IF;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.commissions
  SET montant_commercial = ROUND(p_montant_commercial, 2),
      montant_societe = ROUND(p_montant_societe, 2)
  WHERE id = c.id;

  INSERT INTO public.commission_ajustements (
    commission_id, auteur_id, montant_commercial_avant, montant_commercial_apres,
    montant_societe_avant, montant_societe_apres, motif
  ) VALUES (
    c.id, auth.uid(), COALESCE(c.montant_commercial, 0), ROUND(p_montant_commercial, 2),
    COALESCE(c.montant_societe, 0), ROUND(p_montant_societe, 2), BTRIM(p_motif)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.ajuster_commission(uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajuster_commission(uuid, numeric, numeric, text) TO authenticated;

COMMIT;
