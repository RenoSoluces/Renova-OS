-- Article L221-10 du Code de la consommation : aucun paiement avant 7 jours pour un contrat conclu hors établissement.
update public.entreprises set devis_conditions_paiement_defaut = 'Acompte de 30 % versé après expiration d’un délai de 7 jours suivant la signature (aucun paiement avant ce délai pour une vente à domicile), solde à la réception des travaux.'
 where devis_conditions_paiement_defaut = 'Acompte de 30% à la signature du devis, solde à la réception des travaux.';
