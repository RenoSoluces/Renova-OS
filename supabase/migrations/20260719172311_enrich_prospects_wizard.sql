/*
# Enrichissement de la table prospects pour le wizard

## Résumé
Ajout des champs nécessaires au wizard de création de prospect en 2 étapes :
civilité, conjoint, adresse structurée, foyer fiscal, statut d'occupation, fiches CEE sélectionnées.

## Champs ajoutés à `prospects`
- `civilite` : M. / Mme / M. et Mme
- `prenom_conjoint`, `nom_conjoint` : identité du conjoint (optionnel)
- `adresse_rue` : numéro et rue
- `adresse_complement` : appartement, bâtiment, etc.
- `code_postal` : code postal
- `ville` : commune
- `nombre_personnes_foyer` : taille du foyer fiscal (1-10)
- `rfr` : revenu fiscal de référence en €
- `categorie_mpr` : catégorie MaPrimeRénov' calculée (très_modeste/modeste/intermédiaire/aisé)
- `statut_occupation` : propriétaire_occupant / locataire / bailleur / syndic
- `fiches_cee` : tableau des codes de fiches CEE sélectionnées (ex: ['BAR-EN-101', 'BAR-TH-174'])
- `source` : déjà présent, conservé

## Sécurité
RLS déjà activé sur la table. Politiques anon+authenticated déjà en place — aucune modification de sécurité nécessaire.
*/

DO $$ BEGIN
  -- civilite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='civilite') THEN
    ALTER TABLE prospects ADD COLUMN civilite text DEFAULT 'M.';
  END IF;
  -- prenom_conjoint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='prenom_conjoint') THEN
    ALTER TABLE prospects ADD COLUMN prenom_conjoint text;
  END IF;
  -- nom_conjoint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='nom_conjoint') THEN
    ALTER TABLE prospects ADD COLUMN nom_conjoint text;
  END IF;
  -- adresse_rue
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='adresse_rue') THEN
    ALTER TABLE prospects ADD COLUMN adresse_rue text;
  END IF;
  -- adresse_complement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='adresse_complement') THEN
    ALTER TABLE prospects ADD COLUMN adresse_complement text;
  END IF;
  -- code_postal
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='code_postal') THEN
    ALTER TABLE prospects ADD COLUMN code_postal text;
  END IF;
  -- ville
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='ville') THEN
    ALTER TABLE prospects ADD COLUMN ville text;
  END IF;
  -- nombre_personnes_foyer
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='nombre_personnes_foyer') THEN
    ALTER TABLE prospects ADD COLUMN nombre_personnes_foyer integer DEFAULT 1;
  END IF;
  -- rfr
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='rfr') THEN
    ALTER TABLE prospects ADD COLUMN rfr numeric(12,2);
  END IF;
  -- categorie_mpr
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='categorie_mpr') THEN
    ALTER TABLE prospects ADD COLUMN categorie_mpr text;
  END IF;
  -- statut_occupation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='statut_occupation') THEN
    ALTER TABLE prospects ADD COLUMN statut_occupation text DEFAULT 'propriétaire_occupant';
  END IF;
  -- fiches_cee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='fiches_cee') THEN
    ALTER TABLE prospects ADD COLUMN fiches_cee text[] DEFAULT '{}';
  END IF;
END $$;
