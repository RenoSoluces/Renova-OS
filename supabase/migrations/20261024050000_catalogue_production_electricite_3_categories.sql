/* Renova OS — « Production d'électricité » séparée en 3 catégories du catalogue :
     - Panneaux photovoltaïques  (categorie = 'photovoltaique')
     - Batterie de stockage      (categorie = 'batterie_stockage')
     - Domotique                 (categorie = 'domotique')

   Règles :
     - Rejouable : seules les lignes encore classées « photovoltaique » (ou « autre » pour les accessoires
       Comwatt) sont déplacées ; un second passage ne modifie plus rien.
     - Batterie de stockage : batteries seules (Victron / RENON, Huawei LUNA2000, Enphase IQ Battery, batterie
       additionnelle, batterie résidentielle du catalogue de base). Les kits « photovoltaïque + batterie »
       restent dans Panneaux photovoltaïques : ce sont des installations vendues au kWc.
       → Pour les ranger plutôt dans Batterie de stockage, retirer la condition « NOT LIKE 'kit%' »
         et ajouter lower(nom) LIKE 'kit photovolta%' dans la requête batteries ci-dessous.
     - Domotique : accessoires de pilotage énergétique Comwatt (COMPACT, module SG Ready, SmartPlug).
       Les installations « DMEGC + APS + Comwatt » restent dans Panneaux photovoltaïques.
     - Aucun prix, aucune aide ni aucune fiche CEE n'est modifié ; l'ancienne catégorie est conservée dans
       caracteristiques.ancienne_categorie.
     - La catégorie professionnelle « pro_photovoltaique » n'est pas concernée. */
DO $$
DECLARE
  v_entreprise uuid;
  v_batteries int := 0;
  v_domotique int := 0;
  v_panneaux int := 0;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise : aucune catégorie de production d''électricité traitée';
    RETURN;
  END IF;

  -- 1. Batteries de stockage (hors kits photovoltaïques complets).
  UPDATE public.catalogue_produits SET
    categorie = 'batterie_stockage',
    catalogue_groupe = 'particulier',
    public_cible = 'particulier',
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb)
      || jsonb_build_object('ancienne_categorie', categorie, 'classement_catalogue', 'Batterie de stockage')
  WHERE entreprise_id = v_entreprise
    AND categorie = 'photovoltaique'
    AND (
      reference IN ('BAT-512-MONO', 'BAT-1024-MONO', 'BAT-1024-TRI', 'RENON-512-ADD', 'LUNA2000-S1', 'IQ-BATTERY-5P')
      OR lower(nom) LIKE '%batterie de stockage%'
      OR lower(nom) LIKE '%stockage batterie%'
      OR lower(nom) LIKE '%batterie additionnelle%'
    )
    AND lower(nom) NOT LIKE 'kit%'
    AND lower(nom) NOT LIKE '%installation%'
    AND lower(nom) NOT LIKE '%panneaux%';
  GET DIAGNOSTICS v_batteries = ROW_COUNT;

  -- 2. Domotique : gestionnaire d'énergie et accessoires de pilotage Comwatt.
  UPDATE public.catalogue_produits SET
    categorie = 'domotique',
    catalogue_groupe = 'particulier',
    public_cible = 'particulier',
    caracteristiques = COALESCE(caracteristiques, '{}'::jsonb)
      || jsonb_build_object(
           'ancienne_categorie', categorie,
           'classement_catalogue', 'Domotique',
           'famille', 'Domotique / pilotage énergétique'
         )
  WHERE entreprise_id = v_entreprise
    AND categorie IN ('photovoltaique', 'autre')
    AND (
      reference IN ('COMPACT-GEN4', 'MODULE-SG-READY', 'SMARTPLUG-GEN4')
      OR lower(nom) LIKE 'comwatt%'
    )
    AND lower(nom) NOT LIKE 'kit%'
    AND lower(nom) NOT LIKE '%installation%';
  GET DIAGNOSTICS v_domotique = ROW_COUNT;

  SELECT count(*) INTO v_panneaux
  FROM public.catalogue_produits
  WHERE entreprise_id = v_entreprise AND categorie = 'photovoltaique';

  RAISE NOTICE 'Production d''électricité : % batterie(s) → Batterie de stockage, % accessoire(s) → Domotique, % ligne(s) restent dans Panneaux photovoltaïques',
    v_batteries, v_domotique, v_panneaux;
END $$;
