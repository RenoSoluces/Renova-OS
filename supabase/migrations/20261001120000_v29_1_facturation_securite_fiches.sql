/* V29.1 — facturation complète, coordonnées légales, fiches techniques et sécurité catalogue */

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS forme_juridique text DEFAULT '',
  ADD COLUMN IF NOT EXISTS capital_social text DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_tva text DEFAULT '',
  ADD COLUMN IF NOT EXISTS iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bic text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banque text DEFAULT '',
  ADD COLUMN IF NOT EXISTS conditions_paiement_defaut text DEFAULT 'Paiement à 30 jours date de facture',
  ADD COLUMN IF NOT EXISTS taux_penalite_retard text DEFAULT '3 fois le taux d''intérêt légal',
  ADD COLUMN IF NOT EXISTS escompte_defaut text DEFAULT 'Néant';

ALTER TABLE installateurs
  ADD COLUMN IF NOT EXISTS siret text DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_tva text DEFAULT '';

ALTER TABLE dossier_facturation
  ADD COLUMN IF NOT EXISTS date_echeance date,
  ADD COLUMN IF NOT EXISTS conditions_paiement text DEFAULT '',
  ADD COLUMN IF NOT EXISTS categorie_operation text DEFAULT 'prestation de services';

CREATE SEQUENCE IF NOT EXISTS facture_numero_seq START WITH 1;

CREATE OR REPLACE FUNCTION next_facture_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE n bigint;
BEGIN
  IF NOT is_admin_ou_manager() THEN RAISE EXCEPTION 'Accès réservé à l''administration'; END IF;
  n := nextval('facture_numero_seq');
  RETURN 'FAC-' || to_char(current_date,'YYYY') || '-' || lpad(n::text,6,'0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_facture_number() TO authenticated;

ALTER TABLE catalogue_produits ENABLE ROW LEVEL SECURITY;
/* La construction des devis conserve l'accès technique nécessaire aux tarifs de calcul.
   L'interface commerciale n'affiche toutefois jamais les prix ni les champs tarifaires.
   La vue ci-dessous sert aux écrans qui n'ont besoin que des informations techniques. */
DROP POLICY IF EXISTS "catalogue_select_admin" ON catalogue_produits;
DROP POLICY IF EXISTS "anon_select_catalogue_produits" ON catalogue_produits;
DROP POLICY IF EXISTS "authenticated_select_catalogue_produits" ON catalogue_produits;
CREATE POLICY "catalogue_select_authenticated" ON catalogue_produits
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "catalogue_write_admin" ON catalogue_produits;
CREATE POLICY "catalogue_write_admin" ON catalogue_produits
  FOR ALL TO authenticated
  USING (is_admin_ou_manager()) WITH CHECK (is_admin_ou_manager());

CREATE OR REPLACE VIEW catalogue_produits_commercial AS
SELECT id, entreprise_id, categorie, nom, marque, reference, description,
       caracteristiques, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee,
       actif, created_at
FROM catalogue_produits
WHERE actif = true;
GRANT SELECT ON catalogue_produits_commercial TO authenticated;
