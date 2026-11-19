-- Arrêté du 1er juin 2026 : surplus ≤ 9 kWc racheté 1,1 c€/kWh, prime à l'autoconsommation supprimée.
update public.entreprises set pv_prix_revente_surplus_eur_kwh = 0.011 where pv_prix_revente_surplus_eur_kwh = 0.13;
update public.entreprises set pv_prime_moins_3kwc_eur_par_kwc = 0, pv_prime_3_9kwc_eur_par_kwc = 0, pv_prime_9_36kwc_eur_par_kwc = 0, pv_prime_plus_36kwc_eur_par_kwc = 0
 where pv_prime_3_9kwc_eur_par_kwc = 190;
