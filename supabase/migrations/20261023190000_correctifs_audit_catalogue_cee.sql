-- Correctifs audit catalogue / conformité CEE (23/10/2026)
-- 1. Retire des descriptions client les mentions internes « Fiche CEE de référence : … » /
--    « Fiche de référence : … » / « Fiche CEE BAR-TH-171 : vérifier … » héritées des imports
--    Atlantic et De Dietrich. La fiche reste portée par la colonne fiche_cee.
-- 2. Supprime le drapeau prix_a_renseigner sur les produits qui ont déjà un prix > 0
--    (la migration Atlantic l'avait remis à true sur des produits chiffrés).
-- 3. Échafaudage / enduit ITE : prestations sans fiche CEE (eligible_cee=false, fiche_cee vide).
BEGIN;

UPDATE public.catalogue_produits
SET description = btrim(regexp_replace(regexp_replace(
      regexp_replace(description,
        '\s*Fiche (CEE )?de r[ée]f[ée]rence\s*:\s*(BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-[0-9]{3}[^.]*\.?', '', 'gi'),
        '\s*Fiche CEE (BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-[0-9]{3}\s*:[^.]*\.?', '', 'gi'),
        '\s{2,}', ' ', 'g'))
WHERE description ~* 'Fiche (CEE )?(de r[ée]f[ée]rence\s*:|(BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-[0-9]{3}\s*:)';

UPDATE public.catalogue_produits
SET caracteristiques = caracteristiques - 'prix_a_renseigner'
WHERE COALESCE(prix_unitaire_ht, 0) > 0
  AND caracteristiques ? 'prix_a_renseigner';

UPDATE public.catalogue_produits
SET caracteristiques = caracteristiques - 'forfait_pose_a_renseigner'
WHERE COALESCE(forfait_pose_ht, 0) > 0
  AND caracteristiques ? 'forfait_pose_a_renseigner';

UPDATE public.catalogue_produits
SET eligible_cee = false, fiche_cee = '',
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb) || '{"pose_separee":true}'::jsonb
WHERE reference IN ('FAC_ECHAFAUDAGE', 'FAC_ENDUIT')
   OR caracteristiques->>'prestation_ite' IN ('echafaudage', 'enduit');

COMMIT;
