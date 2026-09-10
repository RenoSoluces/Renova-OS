/*
# RENOVA OS — 3CL & Aides : champs additionnels

1. Modified Tables
- `visites` — Ajout des champs 3CL (enveloppe, systèmes, résultat DPE) pour le moteur 3CL-DPE.
  - `entree_3cl` (jsonb) : données d'entrée du moteur 3CL (surface, isolation, chauffage, zone climatique…)
  - `resultat_3cl` (jsonb) : résultat du calcul 3CL (conso Ep, émissions, étiquette DPE)
  - `produits_eligibles` (jsonb) : liste des produits de rénovation identifiés pendant la visite
- `simulations` — Ajout des champs pour le calcul d'aides et DPE avant/après.
  - `dpe_avant` (text) : étiquette DPE avant travaux
  - `dpe_apres` (text) : étiquette DPE après travaux (simulé)
  - `resultat_3cl_avant` (jsonb) : résultat 3CL initial
  - `resultat_3cl_apres` (jsonb) : résultat 3CL simulé après travaux
  - `categorie_revenu` (text) : catégorie de revenu MaPrimeRénov'
  - `rfr_par_part` (numeric) : revenu fiscal de référence par part
  - `resultat_aides` (jsonb) : résultat complet du calcul d'aides (MPR + CEE BAR TH 174 + 1€)
  - `eligibilite_1euro` (boolean) : éligibilité au dispositif rénovation à 1€

2. Security
- Aucune modification de politique RLS. Les tables existent déjà avec les politiques anon/authenticated.
- Les nouveaux champs héritent des politiques existantes.
*/

ALTER TABLE visites ADD COLUMN IF NOT EXISTS entree_3cl jsonb DEFAULT '{}'::jsonb;
ALTER TABLE visites ADD COLUMN IF NOT EXISTS resultat_3cl jsonb DEFAULT '{}'::jsonb;
ALTER TABLE visites ADD COLUMN IF NOT EXISTS produits_eligibles jsonb DEFAULT '[]'::jsonb;

ALTER TABLE simulations ADD COLUMN IF NOT EXISTS dpe_avant text;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS dpe_apres text;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS resultat_3cl_avant jsonb DEFAULT '{}'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS resultat_3cl_apres jsonb DEFAULT '{}'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS categorie_revenu text DEFAULT 'Modeste';
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS rfr_par_part numeric DEFAULT 0;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS resultat_aides jsonb DEFAULT '{}'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS eligibilite_1euro boolean DEFAULT false;
