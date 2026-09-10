-- Conditions de vente paramétrables par défaut pour les devis.
--
-- Constat : `devis.date_validite` existait déjà dans le schéma mais n'était jamais
-- renseignée à la création d'un devis (toujours NULL) — la date de validité
-- n'apparaissait donc jamais sur les devis générés. De même, aucune condition de
-- paiement (acompte, échéancier) n'était pré-remplie : chaque devis partait d'une
-- page blanche sur ce point pourtant systématique.

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS devis_duree_validite_jours integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS devis_conditions_paiement_defaut text NOT NULL DEFAULT 'Acompte de 30% à la signature du devis, solde à la réception des travaux.';

ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS conditions_paiement text NOT NULL DEFAULT '';
