-- Nettoyage des descriptions catalogue, périmètre menuiseries et coût consommables.
-- Migration additive/idempotente : conserve les prix, forfaits de pose et d'évacuation.

ALTER TABLE public.catalogue_produits
  ADD COLUMN IF NOT EXISTS forfait_consommables_ht numeric NOT NULL DEFAULT 0;

-- Ces produits ne relèvent pas de la fiche BAR-EN-104 (fenêtres et portes-fenêtres).
-- Ils ne doivent pas recevoir automatiquement les champs Uw/Sw ni être marqués CEE
-- sur la base de cette fiche. Les autres champs commerciaux ne sont pas modifiés.
UPDATE public.catalogue_produits
SET eligible_cee = false,
    fiche_cee = NULL
WHERE categorie = 'menuiseries_portes'
   OR lower(coalesce(nom, '')) ~ '(porte d.entree|porte entree|volet roulant|bubendorff|men-pvc-fixe|chassis fixe pvc|châssis fixe pvc)';

-- Retire uniquement les notes de provenance internes des descriptions.
UPDATE public.catalogue_produits
SET description = trim(both E' \t\n—–;|,' FROM regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(description, ''), 'Prix HT communiqué dans le catalogue fourni', '', 'gi'),
        'Texte transmis par Reno Soluces le [0-9]{2}/[0-9]{2}/[0-9]{4}', '', 'gi'),
      'Classeur Reno Soluces du [0-9]{2}/[0-9]{2}/[0-9]{4}', '', 'gi')),
    caracteristiques = coalesce(caracteristiques, '{}'::jsonb)
      - 'prix_source' - 'source_import' - 'source_fiche_cee' - 'source_tarifs' - 'source_date';

-- Complète les descriptions avec les caractéristiques techniques déjà enregistrées et non encore mentionnées.
-- N'invente aucune valeur et exclut explicitement prix, pose, aides et métadonnées d'import.
UPDATE public.catalogue_produits p
SET description = concat_ws(E'\n', nullif(trim(p.description), ''), (
  SELECT string_agg(
    initcap(replace(regexp_replace(e.key, '_source$', ''), '_', ' ')) || ' : ' || CASE WHEN jsonb_typeof(e.value) = 'string'
      THEN trim(both '"' FROM e.value::text) ELSE e.value::text END,
    E'\n' ORDER BY e.key
  )
  FROM jsonb_each(coalesce(p.caracteristiques, '{}'::jsonb)) e
  WHERE jsonb_typeof(e.value) NOT IN ('object', 'array', 'null')
    AND nullif(trim(both '"' FROM e.value::text), '') IS NOT NULL
    AND lower(e.key) !~ '(prix|tarif|pose|evacuation|consommable|aide|prime|cee|mpr|source_import|source_fiche_cee|source_tarifs|source_date|prix_source|classeur|transmis|date|gamme_source|type_element|tva|eligible|renseigner|fourniture_ht|conditions_cee|aides_estimatives)'
    AND position(lower(e.key) in lower(coalesce(p.description, ''))) = 0
))
WHERE EXISTS (
    SELECT 1 FROM jsonb_each(coalesce(p.caracteristiques, '{}'::jsonb)) e
    WHERE jsonb_typeof(e.value) NOT IN ('object', 'array', 'null')
      AND nullif(trim(both '"' FROM e.value::text), '') IS NOT NULL
      AND lower(e.key) !~ '(prix|tarif|pose|evacuation|consommable|aide|prime|cee|mpr|source_import|source_fiche_cee|source_tarifs|source_date|prix_source|classeur|transmis|date|gamme_source|type_element|tva|eligible|renseigner|fourniture_ht|conditions_cee|aides_estimatives)'
  );
