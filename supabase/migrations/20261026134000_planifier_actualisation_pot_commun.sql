-- Déjà appliqué sur Supabase le 26/10/2026.
-- actualiser_pot_commun() n'est plus exécutable par les utilisateurs (durcissement du 23/10) :
-- l'appel fait par l'app à l'ouverture des prospects échouait. On l'exécute chaque nuit côté serveur.
create extension if not exists pg_cron;
select cron.schedule('renova_actualiser_pot_commun', '15 3 * * *', $$select public.actualiser_pot_commun();$$);
