/*
# Restauration d'une commission payée écrasée à 0

La règle de barème "Visite Technique Classique" a une date_debut = 2026-09-13,
qui exclut toute VT antérieure à cette date dès que le calcul est relancé —
alors que le statut "payée" de la commission, lui, est protégé et reste
inchangé. Résultat : une commission déjà payée (120 € société / 100 €
commercial, VT du 24/08, payée le 01/09) s'est retrouvée à 0 € tout en
restant marquée "payée".

Cette date de début n'a pas de sens métier apparent (elle correspond à la date
de création de la règle) : on la retire pour éviter que ça ne se reproduise
sur d'autres VT déjà traitées, et on restaure la valeur payée.
*/

-- Restauration de la commission déjà payée (réf. VT commençant par b69afb0b)
UPDATE commissions
SET montant_commercial = 100,
    montant_societe = 120
WHERE reference_type = 'visites'
  AND reference_id = 'b69afb0b-727d-49ef-8e73-4ac43329df56'
  AND statut = 'payee';

-- Retrait de la date de début accidentelle sur la règle
UPDATE commission_bareme
SET date_debut = NULL
WHERE libelle = 'Visite Technique Classique'
  AND type = 'vt';
