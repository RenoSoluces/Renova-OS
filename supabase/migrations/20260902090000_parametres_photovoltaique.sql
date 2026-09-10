-- Paramètres tarifaires du module photovoltaïque, rendus configurables depuis les
-- Paramètres de l'entreprise plutôt que codés en dur dans le moteur de simulation
-- (ces tarifs — prix du kWh, tarif de rachat, coût d'installation, barème de prime —
-- évoluent régulièrement et doivent pouvoir être mis à jour sans redéploiement).

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS pv_prix_achat_evite_eur_kwh numeric NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS pv_prix_revente_surplus_eur_kwh numeric NOT NULL DEFAULT 0.13,
  ADD COLUMN IF NOT EXISTS pv_cout_installation_eur_par_kwc numeric NOT NULL DEFAULT 2200,
  ADD COLUMN IF NOT EXISTS pv_prime_moins_3kwc_eur_par_kwc numeric NOT NULL DEFAULT 220,
  ADD COLUMN IF NOT EXISTS pv_prime_3_9kwc_eur_par_kwc numeric NOT NULL DEFAULT 190,
  ADD COLUMN IF NOT EXISTS pv_prime_9_36kwc_eur_par_kwc numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS pv_prime_plus_36kwc_eur_par_kwc numeric NOT NULL DEFAULT 70;
