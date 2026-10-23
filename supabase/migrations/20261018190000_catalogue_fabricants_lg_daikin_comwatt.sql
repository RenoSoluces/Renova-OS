/*
  Renova OS — extension catalogue fabricants (références documentées publiquement)
  Prix laissés à 0 HT pour saisie ultérieure par un administrateur.
  Les données doivent être revalidées sur la fiche technique correspondant exactement
  à la configuration vendue avant toute émission de devis ou revendication CEE/MPR.
  Sources officielles : LG Business France, Daikin France, Comwatt.
*/
DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : aucun produit catalogue inséré.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"categorie":"pac_air_eau","nom":"LG THERMA V R32 Monobloc S II — 5 kW","marque":"LG","reference":"HM051MRS UA40","description":"Pompe à chaleur air/eau monobloc THERMA V R32 S II, version monophasée. Référence et données issues de la page fabricant; vérifier la configuration hydraulique et les conditions nominales sur la fiche produit avant devis.","unite":"unite","caracteristiques":{"puissance_chauffage_nominale_A7_W35_kW":5.5,"COP_A7_W35":4.7,"SCOP_35_55":"4.46 / 3.20","classe_energetique_35_55":"A+++ / A++","fluide_frigorigene":"R32","GWP":675,"alimentation":"220–240 V, monophasé, 50 Hz","plage_temperature_exterieure_chauffage_C":"-25 à +35","puissance_acoustique_exterieure_dB_A":"57 / 54 (nominal/faible)","poids_unite_exterieure_kg":94,"source_officielle":"https://www.lg.com/fr/business/chauffage-climatisation/solutions-tertiaires/pompes-a-chaleur-air-eau/hm051mrs-ua40/","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"LG THERMA V R32 Monobloc S II — 7 kW","marque":"LG","reference":"HM071MRS UA40","description":"Pompe à chaleur air/eau monobloc THERMA V R32 S II, version monophasée. Vérifier les données de puissance selon le point de fonctionnement dans la fiche fabricant.","unite":"unite","caracteristiques":{"puissance_gamme_kW":7,"fluide_frigorigene":"R32","GWP":675,"alimentation":"220–240 V, monophasé, 50 Hz","SCOP_35_55":"4.48 / 3.20","classe_energetique_35_55":"A+++ / A++","temperature_depart_eau_max_chauffage_C":65,"temperature_exterieure_min_chauffage_C":-25,"source_officielle":"https://www.lg.com/fr/business/chauffage-climatisation/solutions-tertiaires/pompes-a-chaleur-air-eau/r32-monobloc/hm071mrs-ua40/","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"LG THERMA V R32 Monobloc S II — 12 kW triphasé","marque":"LG","reference":"HM123MRS UB40","description":"Pompe à chaleur air/eau monobloc THERMA V R32 S II triphasée. Données à confirmer selon le point de fonctionnement et le kit hydraulique retenu.","unite":"unite","caracteristiques":{"puissance_gamme_kW":12,"fluide_frigorigene":"R32","GWP":675,"alimentation":"380–415 V, triphasé, 50 Hz","SCOP_35_55":"4.67 / 3.47","classe_energetique_35_55":"A+++ / A++","temperature_depart_eau_max_chauffage_C":65,"temperature_exterieure_min_chauffage_C":-25,"source_officielle":"https://www.lg.com/fr/business/chauffage-climatisation/solutions-tertiaires/pompes-a-chaleur-air-eau/r32-monobloc/hm123mrs-ub40/","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"LG THERMA V R32 Monobloc S II — 16 kW triphasé","marque":"LG","reference":"HM163MRS UB40","description":"Pompe à chaleur air/eau monobloc THERMA V R32 S II triphasée. Vérifier les performances selon la température extérieure, le régime d'eau et les accessoires.","unite":"unite","caracteristiques":{"puissance_chauffage_A7_W35_kW":16,"COP_A7_W35":4.7,"COP_A7_W55":2.8,"SCOP_35_55":"4.53 / 3.45","classe_energetique_35_55":"A+++ / A++","fluide_frigorigene":"R32","GWP":675,"alimentation":"380–415 V, triphasé, 50 Hz","niveau_puissance_sonore_dB_A":"61 / 57 (nominal/faible)","dimensions_mm":"1320 × 1019 × 520","poids_unite_exterieure_kg":117,"source_officielle":"https://www.lg.com/fr/business/chauffage-climatisation/solutions-tertiaires/pompes-a-chaleur-air-eau/hm163mrs-ub40/","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"Daikin Altherma 4 H W — unité intérieure murale","marque":"Daikin","reference":"EPBX14A4V","description":"Unité intérieure murale pour système de pompe à chaleur air/eau Daikin Altherma 4 H W. À associer uniquement aux unités extérieures et accessoires explicitement compatibles selon la documentation Daikin.","unite":"unite","caracteristiques":{"gamme":"Altherma 4 H W","type":"Unité intérieure murale / système bibloc","chauffage_appoint_integre_kW":"4,5 ou 9 selon configuration","interface":"Écran tactile MMI 5 pouces","compatibilite_ecs":"Réservoir inox ou accumulateur thermique ECH2O selon configuration","source_officielle":"https://www.daikin.fr/fr_fr/products/product.html/EPBX14A4V.html","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"Daikin Altherma 4 H W — unité intérieure murale (variante)","marque":"Daikin","reference":"EPBX14A9W","description":"Variante d'unité intérieure murale de la gamme Daikin Altherma 4 H W. Vérifier la compatibilité avec l'unité extérieure, la régulation et le chauffage d'appoint prévus.","unite":"unite","caracteristiques":{"gamme":"Altherma 4 H W","type":"Unité intérieure murale / système bibloc","chauffage_appoint_integre_kW":"4,5 ou 9 selon configuration","interface":"Écran tactile MMI 5 pouces","source_officielle":"https://www.daikin.fr/fr_fr/products/product.html/EPBX14A9W.html","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"Daikin Altherma 4 H F — unité intérieure au sol avec ballon ECS","marque":"Daikin","reference":"EPVX14A4V","description":"Unité intérieure au sol de la gamme Altherma 4 H F, destinée au chauffage, au rafraîchissement et à la préparation d'eau chaude sanitaire avec ballon intégré selon la configuration sélectionnée.","unite":"unite","caracteristiques":{"gamme":"Altherma 4 H F","type":"Unité intérieure au sol avec ballon ECS intégré","volume_ballons_compatibles_L":"180 ou 230 selon configuration","chauffage_appoint_integre_kW":"4,5 ou 9 selon configuration","source_officielle":"https://www.daikin.fr/fr_fr/products/product.html/EPVX14A4V.html","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"Daikin Altherma 3 R F — unité intérieure au sol avec ballon ECS","marque":"Daikin","reference":"EBVH-D6V","description":"Unité intérieure au sol de la gamme Altherma 3 R F basse température avec ballon ECS intégré. La référence seule ne constitue pas un système complet : associer une unité extérieure compatible.","unite":"unite","caracteristiques":{"gamme":"Altherma 3 R F","type":"Bi-bloc basse température, chauffage seul selon version","ballon_ECS_L":"180 ou 230 selon configuration","chauffage_appoint_kW":"3, 6 ou 9 selon version","connectivite":"Module ou cartouche WLAN compatible en option","source_officielle":"https://www.daikin.fr/fr_fr/products/product.html/ebvh-d6v.html","prix_a_renseigner":true}},
    {"categorie":"pac_air_eau","nom":"Daikin Altherma 3 R F — unité intérieure au sol avec ballon ECS (variante)","marque":"Daikin","reference":"EBVH-D9W","description":"Variante d'unité intérieure au sol de la gamme Altherma 3 R F basse température avec ballon ECS intégré. Vérifier la configuration complète et la compatibilité de l'unité extérieure.","unite":"unite","caracteristiques":{"gamme":"Altherma 3 R F","type":"Bi-bloc basse température, chauffage seul selon version","ballon_ECS_L":"180 ou 230 selon configuration","chauffage_appoint_kW":"3, 6 ou 9 selon version","connectivite":"Module ou cartouche WLAN compatible en option","source_officielle":"https://www.daikin.fr/fr_fr/products/product.html/EBVH-D9W.html","prix_a_renseigner":true}},
    {"categorie":"photovoltaique","nom":"Comwatt COMPACT — gestionnaire d'énergie intelligent","marque":"Comwatt","reference":"COMPACT-GEN4","description":"Gestionnaire d'énergie pour suivre et piloter les consommations du logement et optimiser l'utilisation de l'énergie, notamment en présence d'une installation photovoltaïque. Vérifier la composition exacte du pack livré.","unite":"unite","caracteristiques":{"famille":"Gestion énergétique / autoconsommation","fonctions":"Suivi de consommation, pilotage des usages et optimisation de l'autoconsommation","interface":"Application web et mobile selon offre","source_officielle":"https://www.comwatt.com/produits/","prix_a_renseigner":true}},
    {"categorie":"autre","nom":"Comwatt Module SG Ready — pilotage PAC et ballon thermodynamique","marque":"Comwatt","reference":"MODULE-SG-READY","description":"Module de pilotage énergétique pour équipements compatibles SG Ready. Vérifier la compatibilité exacte de la pompe à chaleur ou du ballon et les conditions de câblage dans la documentation fabricant.","unite":"unite","caracteristiques":{"famille":"Accessoire de pilotage énergétique","standard":"SG Ready","usage":"Pilotage selon disponibilité énergétique, tarifs et/ou production solaire","source_officielle":"https://www.comwatt.com/produits/accessoires-gen4/module-sg-ready/","prix_a_renseigner":true}},
    {"categorie":"autre","nom":"Comwatt SmartPlug — prise connectée de pilotage","marque":"Comwatt","reference":"SMARTPLUG-GEN4","description":"Accessoire connecté de mesure ou de pilotage pour la solution Comwatt. Vérifier la référence commerciale actuelle, la puissance admissible et les appareils compatibles avant vente.","unite":"unite","caracteristiques":{"famille":"Accessoire de mesure et pilotage","usage":"Commande connectée d'équipements compatibles","source_documentation":"https://www.comwatt.com/documentation/","prix_a_renseigner":true}}
  ]
  $products$::jsonb) LOOP
    SELECT id INTO v_id FROM catalogue_produits
    WHERE categorie = p->>'categorie'
      AND ((COALESCE(p->>'reference','') <> '' AND reference = p->>'reference') OR lower(nom)=lower(p->>'nom'))
    ORDER BY CASE WHEN reference = p->>'reference' AND COALESCE(p->>'reference','') <> '' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif
      ) VALUES (
        v_entreprise,p->>'categorie',p->>'nom',COALESCE(p->>'marque',''),COALESCE(p->>'reference',''),
        COALESCE(p->>'description',''),COALESCE(p->'caracteristiques','{}'::jsonb),
        0,COALESCE(p->>'unite','unite'),20,false,false,'',true
      );
    ELSE
      UPDATE catalogue_produits SET
        nom = p->>'nom',
        marque = COALESCE(NULLIF(p->>'marque',''),marque),
        reference = COALESCE(NULLIF(p->>'reference',''),reference),
        description = COALESCE(NULLIF(p->>'description',''),description),
        caracteristiques = COALESCE(caracteristiques,'{}'::jsonb) || COALESCE(p->'caracteristiques','{}'::jsonb),
        actif = true
      WHERE id = v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;
