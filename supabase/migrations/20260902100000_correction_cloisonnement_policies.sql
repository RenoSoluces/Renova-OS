-- CORRECTIF IMPORTANT — la migration de cloisonnement par commercial
-- (20260827120000_cloisonnement_par_commercial.sql) tentait de supprimer des policies
-- nommées "authenticated_select_<table>" avant de créer les policies restrictives.
-- Or les policies réellement présentes en base s'appelaient "anon_select_<table>"
-- (issues des toutes premières migrations, USING (true), ouvertes à `anon` ET
-- `authenticated`). Ces policies n'ont donc jamais été supprimées : elles restaient actives
-- en parallèle des nouvelles policies restrictives. En PostgreSQL, plusieurs policies
-- permissives sur une même action sont combinées avec OR — la policy grande ouverte
-- rendait donc les nouvelles policies de cloisonnement inopérantes : n'importe quel
-- utilisateur authentifié (et même anonyme) pouvait toujours tout voir.
--
-- Ce correctif supprime les vraies policies permissives héritées et retire l'accès du
-- rôle `anon` sur les tables contenant des données personnelles/commerciales — seul le
-- rôle `authenticated` doit y accéder, via les policies de cloisonnement déjà en place.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospects', 'visites', 'dossiers', 'devis', 'simulations',
    'interactions', 'tasks', 'documents', 'devis_lignes', 'devis_aides'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
    END IF;
  END LOOP;
END $$;

-- Vérification de cohérence : s'assurer qu'il ne reste aucune policy grande ouverte
-- ("qual" = 'true') sur ces tables. Cette requête ne modifie rien ; elle sert de trace
-- dans les logs de migration pour confirmer que le correctif est complet. Si elle
-- retourne des lignes après application, une policy permissive résiduelle doit être
-- investiguée manuellement (nom de policy non standard, ajouté hors de ces migrations).
DO $$
DECLARE
  reste integer;
BEGIN
  SELECT count(*) INTO reste
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('prospects','visites','dossiers','devis','simulations','interactions','tasks','documents','devis_lignes','devis_aides')
    AND qual = 'true';
  IF reste > 0 THEN
    RAISE NOTICE 'Correctif cloisonnement : % policy(ies) encore grande(s) ouverte(s) détectée(s), à vérifier manuellement.', reste;
  END IF;
END $$;
