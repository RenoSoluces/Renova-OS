/*
  RENOVA OS — Harmonisation des descriptions de TOUS les produits du catalogue.
  Objectif : la description explique l'usage du produit ; les performances et
  exigences réglementaires restent dans `caracteristiques`.
  Les anciennes descriptions sont archivées séparément avant toute modification.
  Aucun prix, forfait, référence ou indicateur d'éligibilité n'est modifié.
  Les caractéristiques structurées manquantes sont extraites de l'ancien texte quand c'est possible.
*/

CREATE TABLE IF NOT EXISTS public.catalogue_descriptions_archive (
  produit_id uuid PRIMARY KEY REFERENCES public.catalogue_produits(id) ON DELETE CASCADE,
  nom_produit text NOT NULL DEFAULT '',
  categorie text NOT NULL DEFAULT '',
  description_originale text NOT NULL DEFAULT '',
  archivee_le timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.catalogue_descriptions_archive IS
  'Historique interne des anciennes descriptions longues du catalogue avant harmonisation. Non destiné à être affiché sur les devis.';
ALTER TABLE public.catalogue_descriptions_archive ENABLE ROW LEVEL SECURITY;

-- Archive idempotente : une seule version initiale conservée par produit.
INSERT INTO public.catalogue_descriptions_archive
  (produit_id, nom_produit, categorie, description_originale)
SELECT p.id, COALESCE(p.nom, ''), COALESCE(p.categorie, ''), COALESCE(p.description, '')
FROM public.catalogue_produits p
ON CONFLICT (produit_id) DO NOTHING;


-- Récupère dans les caractéristiques les données techniques structurées qui
-- n'existaient éventuellement que dans l'ancienne description. Les valeurs
-- déjà renseignées dans les champs du catalogue restent prioritaires.
UPDATE public.catalogue_produits p
SET caracteristiques = COALESCE(p.caracteristiques, '{}'::jsonb) ||
  jsonb_strip_nulls(jsonb_build_object(
    CASE WHEN COALESCE(p.fiche_cee, '') IN ('BAR-EN-101','BAR-EN-102','BAR-EN-103')
         THEN 'r' ELSE 'Résistance thermique R' END,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key)
        WHERE lower(keys.key) IN ('r','résistance thermique r','resistance thermique r','resistance_thermique',
                           'resistance_thermique_r_m2k_w')
      )
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)(?:résistance thermique\s*)?R\s*(?:≥|>=|=|:)?\s*([0-9]+(?:[.,][0-9]+)?)'))[1]
      ELSE NULL
    END,
    'Épaisseur',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%épaisseur%' OR lower(keys.key) LIKE '%epaisseur%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)épaisseur\s*:?\s*([0-9]+(?:[.,][0-9]+)?)\s*mm'))[1] || ' mm'
      ELSE NULL
    END,
    'Dimensions',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%dimension%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)([0-9]+(?:[.,][0-9]+)?\s*[×x]\s*[0-9]+(?:[.,][0-9]+)?\s*mm)'))[1]
      ELSE NULL
    END,
    'Norme',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%norme%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)(NF EN\s*[0-9]+(?::[0-9]+)?(?:\+A[0-9]+)?)'))[1]
      ELSE NULL
    END,
    'Conductivité thermique λ',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%conductivité%' OR lower(keys.key) LIKE '%conductivite%' OR lower(keys.key) = 'λ' OR lower(keys.key) = 'lambda')
      THEN COALESCE(
        (regexp_match(COALESCE(p.description, ''), '(?i)conductivité thermique\s*:?\s*λ?\s*=?\s*([0-9]+(?:[.,][0-9]+)?)\s*W'))[1],
        (regexp_match(COALESCE(p.description, ''), '(?i)λ\s*=?\s*([0-9]+(?:[.,][0-9]+)?)\s*W'))[1]
      )
      ELSE NULL
    END,
    'ACERMI',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%acermi%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)ACERMI\s*:?\s*([0-9]{2}/[0-9]{3}/[0-9]+)'))[1]
      ELSE NULL
    END,
    'DTA',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%dta%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)DTA\s*:?\s*([0-9]+/[0-9]+-[0-9]+)'))[1]
      ELSE NULL
    END,
    'Euroclasse',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) LIKE '%euroclasse%' OR lower(keys.key) LIKE '%réaction au feu%' OR lower(keys.key) LIKE '%reaction au feu%')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)Euroclasse\s*:?\s*([A-G](?:1|2|fl)?(?:-[A-F])?)'))[1]
      ELSE NULL
    END,
    'SCOP',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) = 'scop')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)SCOP\s*(?:≥|>=|=|:)?\s*([0-9]+(?:[.,][0-9]+)?)'))[1]
      ELSE NULL
    END,
    'COP',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p.caracteristiques, '{}'::jsonb)) AS keys(key) WHERE lower(keys.key) = 'cop')
      THEN (regexp_match(COALESCE(p.description, ''), '(?i)COP\s*(?:≥|>=|=|:)?\s*([0-9]+(?:[.,][0-9]+)?)'))[1]
      ELSE NULL
    END
  ))
WHERE COALESCE(p.description, '') <> '';

-- Une description courte, sans valeurs de performance qui doivent figurer
-- dans les champs de caractéristiques. Le CASE couvre les catégories connues ;
-- le dernier cas couvre aussi les catégories personnalisées et les nouveaux produits.
UPDATE public.catalogue_produits p
SET description = CASE
  -- Fonctions spécifiques qui ne doivent pas être décrites comme un matériau isolant.
  WHEN lower(coalesce(p.nom, '')) LIKE '%comwatt%sg ready%'
    THEN 'Module de pilotage compatible SG Ready destiné à optimiser le fonctionnement d’une pompe à chaleur avec l’installation photovoltaïque.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%comwatt%smartplug%'
    THEN 'Prise connectée de pilotage permettant de commander un équipement compatible dans le cadre de l’installation énergétique.'
  WHEN coalesce(p.catalogue_groupe, '') = 'visite_technique'
       OR lower(coalesce(p.categorie, '')) LIKE 'vt_%'
       OR lower(coalesce(p.nom, '')) LIKE '%visite technique%'
       OR lower(coalesce(p.nom, '')) LIKE '%diagnostic%'
       OR lower(coalesce(p.nom, '')) LIKE '%audit énergétique%'
       OR lower(coalesce(p.nom, '')) LIKE '%audit energetique%'
    THEN 'Prestation de visite ou d’analyse technique destinée à relever les informations nécessaires à l’étude du projet et à la préparation des travaux.'
  WHEN lower(coalesce(p.nom, '')) LIKE 'forfait pose%'
       OR lower(coalesce(p.nom, '')) LIKE 'pose %'
       OR lower(coalesce(p.nom, '')) LIKE 'main d’œuvre%'
       OR lower(coalesce(p.nom, '')) LIKE 'main d''œuvre%'
       OR lower(coalesce(p.nom, '')) LIKE 'prestation de pose%'
       OR lower(coalesce(p.nom, '')) LIKE 'mise en service%'
       OR lower(coalesce(p.nom, '')) LIKE 'forfait évacuation%'
       OR lower(coalesce(p.nom, '')) LIKE 'forfait evacuation%'
       OR lower(coalesce(p.nom, '')) LIKE 'évacuation%'
       OR lower(coalesce(p.nom, '')) LIKE 'evacuation%'
       OR lower(coalesce(p.nom, '')) LIKE 'dépose%'
       OR lower(coalesce(p.nom, '')) LIKE 'depose%'
    THEN 'Prestation de pose, d’installation, de mise en service ou d’évacuation correspondant au périmètre précisé sur la ligne du devis.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%batterie%' OR lower(coalesce(p.nom, '')) LIKE '%stockage%'
       OR lower(coalesce(p.categorie, '')) LIKE '%batterie%'
    THEN 'Équipement de stockage électrique destiné à conserver une partie de l’énergie produite pour une utilisation ultérieure, selon la configuration retenue.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%panneau photovoltaïque%'
       OR lower(coalesce(p.nom, '')) LIKE '%photovoltaïque%'
       OR lower(coalesce(p.categorie, '')) IN ('photovoltaique', 'pro_photovoltaique')
    THEN 'Équipement de production d’électricité à partir du rayonnement solaire, à intégrer à une installation dimensionnée selon le site et les besoins.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%micro-onduleur%'
       OR lower(coalesce(p.nom, '')) LIKE '%onduleur%'
    THEN 'Équipement de conversion électrique destiné à l’installation photovoltaïque, selon l’architecture et le dimensionnement retenus.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%comwatt%'
       OR lower(coalesce(p.nom, '')) LIKE '%pilotage%'
       OR lower(coalesce(p.nom, '')) LIKE '%gestionnaire d’énergie%'
    THEN 'Équipement de pilotage énergétique destiné à suivre ou optimiser les usages de l’installation, selon les fonctions du modèle retenu.'

  -- Isolation : la description indique l'application, pas les caractéristiques R, lambda, épaisseur ou certifications.
  WHEN lower(coalesce(p.categorie, '')) IN ('combles_perdus', 'combles', 'isolation_combles_pro')
       OR lower(coalesce(p.categorie, '')) LIKE '%combles_perdus%'
       OR lower(coalesce(p.nom, '')) LIKE '%combles perdus%'
    THEN 'Isolant destiné à l’isolation thermique des combles perdus. La technique de pose et la performance retenue doivent être adaptées au produit et au chantier.'
  WHEN lower(coalesce(p.categorie, '')) IN ('rampants')
       OR lower(coalesce(p.categorie, '')) LIKE '%rampant%'
       OR lower(coalesce(p.nom, '')) LIKE '%rampant%'
       OR lower(coalesce(p.nom, '')) LIKE '%sarking%'
    THEN 'Isolant destiné à l’isolation thermique des rampants ou de la toiture. Le système de pose doit être compatible avec la couverture et la configuration du bâtiment.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%iti%'
       OR lower(coalesce(p.nom, '')) LIKE '%insufflation%'
       OR lower(coalesce(p.nom, '')) LIKE '%doublage isolant%'
    THEN 'Produit destiné à l’isolation des murs par l’intérieur ou par insufflation, selon la technique et la configuration du support.'
  WHEN lower(coalesce(p.categorie, '')) IN ('ite', 'murs', 'isolation_ite', 'professionnel_ite')
       OR lower(coalesce(p.categorie, '')) LIKE 'ite_%'
       OR lower(coalesce(p.nom, '')) LIKE 'ite%'
       OR lower(coalesce(p.nom, '')) LIKE '% ite %'
       OR lower(coalesce(p.nom, '')) LIKE '%façade%'
       OR lower(coalesce(p.nom, '')) LIKE '%facade%'
    THEN 'Produit ou composant destiné à l’isolation thermique des murs par l’extérieur. La compatibilité avec le système complet, le support et la finition doit être vérifiée avant la pose.'
  WHEN lower(coalesce(p.categorie, '')) IN ('plancher', 'plancher_bas')
       OR lower(coalesce(p.categorie, '')) LIKE '%plancher%'
       OR lower(coalesce(p.nom, '')) LIKE '%plancher bas%'
       OR lower(coalesce(p.nom, '')) LIKE '%sous-face%'
       OR lower(coalesce(p.nom, '')) LIKE '%sous face%'
    THEN 'Isolant destiné à l’isolation thermique du plancher bas. Le support, l’exposition à l’humidité et le mode de fixation doivent être vérifiés avant la mise en œuvre.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%isolation%'
       OR lower(coalesce(p.categorie, '')) LIKE '%isolation%'
    THEN 'Produit destiné à améliorer l’isolation thermique de la paroi concernée. Son domaine d’emploi et sa mise en œuvre doivent être adaptés au support et au chantier.'

  -- Chauffage et eau chaude sanitaire.
  WHEN lower(coalesce(p.categorie, '')) = 'pac_air_eau'
       OR lower(coalesce(p.nom, '')) LIKE '%pac air/eau%'
       OR lower(coalesce(p.nom, '')) LIKE '%pompe à chaleur air/eau%'
    THEN 'Pompe à chaleur destinée au chauffage hydraulique du logement. Les usages, la puissance et le régime de température dépendent du modèle retenu et du dimensionnement.'
  WHEN lower(coalesce(p.categorie, '')) = 'pac_air_air'
       OR lower(coalesce(p.nom, '')) LIKE '%pac air/air%'
       OR lower(coalesce(p.nom, '')) LIKE '%climatiseur%'
       OR lower(coalesce(p.nom, '')) LIKE '%mono-split%'
       OR lower(coalesce(p.nom, '')) LIKE '%multi-split%'
    THEN 'Pompe à chaleur air/air destinée au chauffage et, selon le modèle, au rafraîchissement des pièces desservies.'
  WHEN lower(coalesce(p.categorie, '')) = 'pac_geothermie'
       OR lower(coalesce(p.nom, '')) LIKE '%géotherm%'
       OR lower(coalesce(p.nom, '')) LIKE '%geotherm%'
    THEN 'Pompe à chaleur utilisant l’énergie du sol ou d’une source géothermique pour alimenter le système de chauffage, selon le type de captage retenu.'
  WHEN lower(coalesce(p.categorie, '')) = 'ballon_thermodynamique'
       OR lower(coalesce(p.nom, '')) LIKE '%thermodynamique%'
    THEN 'Chauffe-eau thermodynamique destiné à la production d’eau chaude sanitaire. Le volume, la source d’air et les performances dépendent du modèle retenu.'
  WHEN lower(coalesce(p.categorie, '')) IN ('ssc', 'solaire_thermique')
       OR lower(coalesce(p.categorie, '')) LIKE '%solaire_thermique%'
       OR lower(coalesce(p.nom, '')) LIKE '%solaire thermique%'
       OR lower(coalesce(p.nom, '')) LIKE '%système solaire combiné%'
       OR lower(coalesce(p.nom, '')) LIKE '%systeme solaire combine%'
       OR lower(coalesce(p.nom, '')) LIKE '%chauffe-eau solaire%'
    THEN 'Équipement solaire thermique destiné à produire de l’eau chaude sanitaire et/ou à contribuer au chauffage selon la configuration du système.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%chaudière%'
       OR lower(coalesce(p.nom, '')) LIKE '%chaudiere%'
       OR lower(coalesce(p.categorie, '')) LIKE '%chaudi%'
    THEN 'Équipement de production de chaleur destiné au système de chauffage du bâtiment, selon l’énergie utilisée et la configuration retenue.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%radiateur%'
       OR lower(coalesce(p.nom, '')) LIKE '%émetteur%'
       OR lower(coalesce(p.nom, '')) LIKE '%emetteur%'
    THEN 'Équipement d’émission ou de diffusion de chaleur destiné à être raccordé au système de chauffage compatible.'

  -- Ventilation, menuiseries et équipements complémentaires.
  WHEN lower(coalesce(p.categorie, '')) = 'vmc'
       OR lower(coalesce(p.nom, '')) LIKE '%vmc%'
       OR lower(coalesce(p.nom, '')) LIKE '%ventilation%'
    THEN 'Équipement de ventilation destiné au renouvellement de l’air intérieur. La composition du système dépend du type de ventilation et du logement.'
  WHEN lower(coalesce(p.categorie, '')) IN ('menuiseries', 'menuiseries_portes')
       OR lower(coalesce(p.categorie, '')) LIKE '%menuiserie%'
       OR lower(coalesce(p.nom, '')) LIKE '%fenêtre%'
       OR lower(coalesce(p.nom, '')) LIKE '%fenetre%'
       OR lower(coalesce(p.nom, '')) LIKE '%porte d’entrée%'
       OR lower(coalesce(p.nom, '')) LIKE '%porte d''entrée%'
       OR lower(coalesce(p.nom, '')) LIKE '%volet%'
    THEN 'Menuiserie ou fermeture destinée à remplacer ou équiper une ouverture du bâtiment. Les performances et dimensions sont celles de la référence sélectionnée.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%destratificateur%'
       OR lower(coalesce(p.categorie, '')) = 'destratificateur'
    THEN 'Équipement destiné à homogénéiser la température de l’air dans les locaux de grande hauteur.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%hp flottante%'
       OR lower(coalesce(p.categorie, '')) = 'hp_flottante'
    THEN 'Prestation ou équipement relatif à l’optimisation du fonctionnement frigorifique ; le périmètre exact est défini par la référence et le devis.'
  WHEN lower(coalesce(p.categorie, '')) LIKE '%isolation_toiture%'
    THEN 'Produit ou système destiné à l’isolation d’une toiture plate. La composition et le domaine d’emploi doivent être validés selon le support et l’étanchéité existante.'

  -- Prestations et visites : aucune performance produit n'est suggérée.
  WHEN coalesce(p.catalogue_groupe, '') = 'visite_technique'
       OR lower(coalesce(p.categorie, '')) LIKE 'vt_%'
       OR lower(coalesce(p.nom, '')) LIKE '%visite technique%'
       OR lower(coalesce(p.nom, '')) LIKE '%diagnostic%'
       OR lower(coalesce(p.nom, '')) LIKE '%audit%'
    THEN 'Prestation de visite ou d’analyse technique destinée à relever les informations nécessaires à l’étude du projet et à la préparation des travaux.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%pose%'
       OR lower(coalesce(p.nom, '')) LIKE '%main d’œuvre%'
       OR lower(coalesce(p.nom, '')) LIKE '%main d''œuvre%'
       OR lower(coalesce(p.nom, '')) LIKE '%installation%'
       OR lower(coalesce(p.nom, '')) LIKE '%mise en service%'
    THEN 'Prestation de pose, d’installation ou de mise en service correspondant à l’équipement et au périmètre précisés sur la ligne du devis.'
  WHEN lower(coalesce(p.nom, '')) LIKE '%évacuation%'
       OR lower(coalesce(p.nom, '')) LIKE '%evacuation%'
       OR lower(coalesce(p.nom, '')) LIKE '%dépose%'
       OR lower(coalesce(p.nom, '')) LIKE '%déchet%'
    THEN 'Prestation liée à la dépose, à la manutention ou à l’évacuation des éléments concernés, selon le périmètre prévu au devis.'

  -- Catégories professionnelles / équipements divers.
  WHEN coalesce(p.catalogue_groupe, '') = 'professionnel'
       OR lower(coalesce(p.categorie, '')) LIKE 'professionnel%'
       OR lower(coalesce(p.categorie, '')) LIKE 'pro_%'
    THEN 'Équipement ou prestation destiné à un usage professionnel. Les conditions d’application et la mise en œuvre dépendent de la référence sélectionnée et du site.'
  WHEN lower(coalesce(p.categorie, '')) = 'autre'
       OR lower(coalesce(p.categorie, '')) LIKE '%prestation%'
    THEN 'Prestation ou fourniture correspondant au besoin décrit par la désignation de la ligne du devis.'

  ELSE
    'Fourniture ou équipement correspondant à la référence sélectionnée. Les caractéristiques, le domaine d’emploi et les conditions de mise en œuvre sont définis par la fiche produit et le périmètre du devis.'
END;

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.catalogue_produits;
  RAISE NOTICE 'Descriptions harmonisées pour % produits du catalogue. Anciennes descriptions conservées dans catalogue_descriptions_archive.', n;
END $$;
