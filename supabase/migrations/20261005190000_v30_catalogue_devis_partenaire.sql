/*
  V30 — catalogue particuliers/professionnels, CEE, commissions au m²
  et devis partenaires (IDEHOME by Reno Soluces).
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Catalogue : public cible
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE catalogue_produits
  ADD COLUMN IF NOT EXISTS public_cible text NOT NULL DEFAULT 'particulier';

ALTER TABLE catalogue_produits
  DROP CONSTRAINT IF EXISTS catalogue_produits_public_cible_check;

ALTER TABLE catalogue_produits
  ADD CONSTRAINT catalogue_produits_public_cible_check
  CHECK (public_cible IN ('particulier', 'professionnel', 'tous'));

CREATE INDEX IF NOT EXISTS idx_catalogue_produits_public_cible
  ON catalogue_produits(public_cible);

-- Les produits déjà présents sont des produits résidentiels.
UPDATE catalogue_produits
SET public_cible = 'particulier'
WHERE public_cible IS NULL OR public_cible = '';

-- BAR-TH-168 : produit de catalogue pour le solaire thermique résidentiel.
-- Le tarif est volontairement à 0 : il doit être renseigné par l'administration
-- avant utilisation dans un devis.
DO $$
DECLARE v_entreprise uuid;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;

  IF v_entreprise IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM catalogue_produits
       WHERE fiche_cee = 'BAR-TH-168'
          OR (categorie = 'solaire_thermique' AND nom ILIKE 'Dispositif solaire thermique%')
     )
  THEN
    INSERT INTO catalogue_produits (
      entreprise_id, categorie, public_cible, nom, marque, reference,
      description, caracteristiques, prix_unitaire_ht, unite, tva_taux,
      eligible_mpr, eligible_cee, fiche_cee, actif
    ) VALUES (
      v_entreprise,
      'solaire_thermique',
      'particulier',
      'Dispositif solaire thermique — BAR-TH-168',
      '',
      'BAR-TH-168',
      'Installation d’un dispositif solaire thermique associé à un appoint séparé, pour maison individuelle existante en France métropolitaine.',
      '{"fiche_cee":"BAR-TH-168","surface_minimale":"Selon usage et version de la fiche","qualification":"Professionnel titulaire du signe de qualité requis"}'::jsonb,
      0,
      'm2',
      5.5,
      false,
      true,
      'BAR-TH-168',
      true
    );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Matrice de rémunération : public cible + calcul au m²
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE commission_bareme
  ADD COLUMN IF NOT EXISTS public_cible text NOT NULL DEFAULT 'tous';

ALTER TABLE commission_bareme
  DROP CONSTRAINT IF EXISTS commission_bareme_public_cible_check;

ALTER TABLE commission_bareme
  ADD CONSTRAINT commission_bareme_public_cible_check
  CHECK (public_cible IN ('particulier', 'professionnel', 'tous'));

-- `mode = par_m2` signifie que les montants commercial/société sont des
-- montants unitaires multipliés par la quantité de la ligne de devis.
COMMENT ON COLUMN commission_bareme.mode IS
  'Mode de calcul : fixe, par_m2 ou pourcentage. En par_m2, les montants sont multipliés par la quantité du produit.';

CREATE OR REPLACE FUNCTION fn_commission_rule(
  p_type text,
  p_commercial uuid,
  p_produit uuid,
  p_date date
)
RETURNS commission_bareme
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT cb.*
  FROM commission_bareme cb
  WHERE cb.type = p_type
    AND cb.actif = true
    AND (cb.date_debut IS NULL OR cb.date_debut <= p_date)
    AND (cb.date_fin IS NULL OR cb.date_fin >= p_date)
    AND (cb.commercial_id IS NULL OR cb.commercial_id = p_commercial)
    AND (cb.produit_id IS NULL OR cb.produit_id = p_produit)
    AND (
      cb.public_cible = 'tous'
      OR cb.public_cible = COALESCE(
        (SELECT cp.public_cible FROM catalogue_produits cp WHERE cp.id = p_produit),
        'particulier'
      )
    )
  ORDER BY
    ((cb.commercial_id IS NOT NULL)::int +
     (cb.produit_id IS NOT NULL)::int +
     (cb.public_cible <> 'tous')::int) DESC,
    cb.priorite DESC,
    cb.created_at DESC
  LIMIT 1
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Devis : émetteur / partenaire de devis
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS emetteur_type text NOT NULL DEFAULT 'renova_soluces',
  ADD COLUMN IF NOT EXISTS emetteur_installateur_id uuid REFERENCES installateurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emetteur_nom_affichage text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_raison_sociale text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_forme_juridique text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_siret text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_numero_tva text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_adresse text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_code_postal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_ville text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_telephone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emetteur_cgv text DEFAULT '';

ALTER TABLE devis
  DROP CONSTRAINT IF EXISTS devis_emetteur_type_check;

ALTER TABLE devis
  ADD CONSTRAINT devis_emetteur_type_check
  CHECK (emetteur_type IN ('renova_soluces', 'partenaire'));

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Partenaires autorisés à émettre des devis
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE installateurs
  ADD COLUMN IF NOT EXISTS siret text DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_tva text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_autorise boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS devis_nom_affichage text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_raison_sociale text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_forme_juridique text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_numero_tva text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS devis_cgv text DEFAULT '';

-- Configuration IDEHOME : les coordonnées juridiques proviennent de la page
-- Mentions légales officielle d'IDEHOME France. Les CGV ne sont pas publiées
-- de manière accessible sur le site au moment de cette version : le champ
-- devis_cgv reste donc volontairement vide jusqu'à fourniture/validation du texte.
UPDATE installateurs
SET
  devis_autorise = true,
  devis_nom_affichage = 'IDEHOME by Reno Soluces',
  devis_raison_sociale = 'IDEHOME FRANCE SAS',
  devis_forme_juridique = 'SAS',
  siret = COALESCE(NULLIF(siret, ''), '794 818 567 00040'),
  numero_tva = COALESCE(NULLIF(numero_tva, ''), 'FR64794818567'),
  adresse = COALESCE(NULLIF(adresse, ''), '6 Rue Saint Exupéry'),
  code_postal = COALESCE(NULLIF(code_postal, ''), '34430'),
  ville = COALESCE(NULLIF(ville, ''), 'Saint-Jean-de-Védas'),
  telephone = COALESCE(NULLIF(telephone, ''), '0 800 746 502'),
  devis_logo_url = '/idehome-by-reno-soluces.png'
WHERE lower(nom) LIKE '%idehome%';

-- Si le partenaire n'existe pas encore, on le crée afin que la fonctionnalité
-- soit immédiatement disponible.
INSERT INTO installateurs (
  nom, devis_autorise, devis_nom_affichage, devis_raison_sociale,
  devis_forme_juridique, siret, numero_tva, adresse, code_postal, ville,
  telephone, devis_logo_url, actif
)
SELECT
  'IDEHOME France',
  true,
  'IDEHOME by Reno Soluces',
  'IDEHOME FRANCE SAS',
  'SAS',
  '794 818 567 00040',
  'FR64794818567',
  '6 Rue Saint Exupéry',
  '34430',
  'Saint-Jean-de-Védas',
  '0 800 746 502',
  '/idehome-by-reno-soluces.png',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM installateurs WHERE lower(nom) LIKE '%idehome%'
);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Commission devis signé : prise en compte du mode par_m2
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_commission_devis_signe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r commission_bareme%ROWTYPE;
  v_com uuid;
  v_prod uuid;
  v_quantite numeric := 1;
  base numeric;
  m_com numeric;
  m_soc numeric;
BEGIN
  IF NEW.statut <> 'signe'
     OR (TG_OP = 'UPDATE' AND OLD.statut = 'signe')
  THEN
    RETURN NEW;
  END IF;

  SELECT p.commercial_id INTO v_com
  FROM prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_com IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT dl.produit_id, COALESCE(dl.quantite, 1)
    INTO v_prod, v_quantite
  FROM devis_lignes dl
  WHERE dl.devis_id = NEW.id
    AND dl.produit_id IS NOT NULL
  ORDER BY dl.ordre
  LIMIT 1;

  SELECT * INTO r
  FROM fn_commission_rule(
    'devis_signe',
    v_com,
    v_prod,
    COALESCE(NEW.date_creation::date, current_date)
  );

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  base := CASE r.base_pourcentage
    WHEN 'reste_a_charge' THEN COALESCE(NEW.reste_a_charge, 0)
    WHEN 'montant_ttc' THEN COALESCE(NEW.montant_ttc, 0)
    ELSE COALESCE(NEW.montant_ht, 0)
  END;

  IF r.mode = 'par_m2' THEN
    m_com := COALESCE(r.montant_commercial, 0) * COALESCE(v_quantite, 1)
               + COALESCE(r.pourcentage_commercial, 0) / 100 * base;
    m_soc := COALESCE(r.montant_societe, 0) * COALESCE(v_quantite, 1);
  ELSE
    m_com := COALESCE(r.montant_commercial, 0)
               + COALESCE(r.pourcentage_commercial, 0) / 100 * base;
    m_soc := COALESCE(r.montant_societe, 0);
  END IF;

  INSERT INTO commissions (
    commercial_id, type, libelle, reference_type, reference_id,
    montant_commercial, montant_societe, statut
  ) VALUES (
    v_com, 'devis_signe', 'Devis signé — ' || COALESCE(NEW.numero, ''),
    'devis', NEW.id, m_com, m_soc, 'en_attente'
  )
  ON CONFLICT (reference_type, reference_id) DO UPDATE SET
    montant_commercial = EXCLUDED.montant_commercial,
    montant_societe = EXCLUDED.montant_societe;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_devis_signe ON devis;
CREATE TRIGGER trg_sync_commission_devis_signe
AFTER INSERT OR UPDATE OF statut
ON devis
FOR EACH ROW
EXECUTE FUNCTION fn_sync_commission_devis_signe();
