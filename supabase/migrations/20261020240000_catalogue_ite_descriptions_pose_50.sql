-- Renova OS — ITE : descriptions de devis, fourniture distincte et pose à 50 €/m².
-- Les tarifs de fourniture ci-dessous sont ceux transmis par Reno Soluces le 20/10/2026.
-- La pose est ajoutée par DevisPage.tsx comme une ligne distincte « Pose — ... ».
-- Échafaudage et enduit restent des lignes de prestation indépendantes.
-- Ne déclare aucune certification/éligibilité réglementaire non vérifiée pour la référence exacte.
BEGIN;

-- Références d'isolants listées par Reno Soluces : prix catalogue = fourniture seule.
WITH tarifs(reference, nom, prix) AS (
  VALUES
    ('239630', 'Rockwool Ecorock Mono — 134 mm', 62.01::numeric),
    ('235043', 'Soprema Efigreen ITE — 82 mm', 59.70::numeric),
    ('35343', 'Hirsch Graphipan ITE TH32 — 140 mm', 90.00::numeric),
    ('13056', 'Isover Isofaçade 30P — 120 mm', 55.65::numeric),
    ('87220', 'Isover Isofaçade 32R — 120 mm', 23.70::numeric),
    ('2816688', 'Knauf Therm ITEx TH38 SE — 140 mm', 0::numeric),
    ('2816743', 'Knauf XTherm ITEx Sun+ graphité — 120 mm', 23.25::numeric),
    ('2816745', 'Knauf XTherm ITEx Sun+ graphité — 140 mm', 23.85::numeric),
    ('231110', 'Soprema Pavawall Smart — 145 mm', 69.60::numeric),
    ('102713', 'Rockwool Rockfaçade — 130 mm', 16.96::numeric),
    ('100545', 'Rockwool Rockfaçade — 150 mm', 19.57::numeric),
    ('346881', 'Rockwool Rockfaçade Premium — 120 mm', 23.72::numeric),
    ('656159', 'Knauf Insulation Smartfaçade 32 BR — 120 mm', 20.40::numeric),
    ('656234', 'Knauf Insulation Smartfaçade 35 BR — 140 mm', 15.85::numeric)
)
UPDATE catalogue_produits cp
SET prix_unitaire_ht = t.prix,
    forfait_pose_ht = 50,
    forfait_evacuation_ht = 0,
    description = CASE t.reference
      WHEN '239630' THEN 'Panneau de laine de roche ROCKWOOL Ecorock Mono, épaisseur 134 mm, résistance thermique R = 3,70 m²·K/W, conductivité thermique λ = 0,036 W/(m·K). Prévu pour un système d’ITE sous enduit compatible. Le devis distingue la fourniture du panneau, l’échafaudage, le système d’enduit et la pose. Fixations, chevillage, trame, sous-enduit et finition doivent respecter le DTA/ETA et les prescriptions du système complet effectivement retenu. Vérifier les documents valides pour la référence livrée.'
      WHEN '235043' THEN 'Panneau isolant SOPREMA Efigreen ITE, épaisseur 82 mm, R = 3,70 m²·K/W, λ = 0,022 W/(m·K), selon les données du catalogue fourni. La compatibilité avec le système de façade retenu (sous enduit ou bardage) doit impérativement être confirmée par la documentation fabricant pour cette référence exacte avant chiffrage définitif et mise en œuvre. Fourniture séparée de l’échafaudage, de l’enduit éventuel et de la ligne de pose.'
      WHEN '35343' THEN 'Panneau isolant HIRSCH Isolation Graphipan ITE TH32. Référence et tarif transmis par Reno Soluces. Les données techniques de l’entrée catalogue mentionnent une épaisseur nominale voisine de 140 mm et R = 4,40 m²·K/W ; confirmer l’épaisseur exacte, le λ déclaré et la référence commerciale sur la fiche fabricant associée au produit livré. Employer uniquement dans un système ITE complet dont le domaine d’emploi est validé. Échafaudage, enduit et pose sont chiffrés séparément.'
      WHEN '13056' THEN 'Panneau de laine de verre ISOVER Isofaçade 30P, épaisseur 120 mm, R = 4,00 m²·K/W, λ = 0,030 W/(m·K). Vérifier le domaine d’emploi de cette référence dans la documentation ISOVER : une laine destinée à une façade ventilée ou préfabriquée ne doit pas être considérée automatiquement comme compatible avec une ITE sous enduit. Les accessoires et le parement sont ceux du système validé. Échafaudage, finition et pose sont des lignes séparées.'
      WHEN '87220' THEN 'Rouleau de laine de verre ISOVER Isofaçade 32R, épaisseur 120 mm, R = 3,75 m²·K/W, λ = 0,032 W/(m·K). La documentation fabricant doit confirmer le domaine d’emploi précis (façade ventilée/préfabriquée ou autre système) avant sélection pour le chantier. Ne pas l’associer à un enduit sans validation explicite du système complet. Échafaudage, parement et pose sont chiffrés séparément.'
      WHEN '2816688' THEN 'Panneau de polystyrène expansé KNAUF Therm ITEx TH38 SE, épaisseur 140 mm, R = 3,70 m²·K/W, λ = 0,038 W/(m·K). Fourniture au tarif à confirmer : aucun prix d’achat validé n’est renseigné. Pour une ITE sous enduit, utiliser le panneau avec les composants, fixations, trame, sous-enduit et finition prescrits par le système évalué. Contrôler le certificat/avis technique en vigueur et la référence exacte avant de valider le devis.'
      WHEN '2816743' THEN 'Panneau de polystyrène expansé graphité KNAUF XTherm ITEx Sun+, épaisseur 120 mm, R = 3,85 m²·K/W, λ = 0,031 W/(m·K). Prévu pour une mise en œuvre ITE dans les limites du système documenté. Le collage, le chevillage, les profils, le treillis, le sous-enduit et la finition doivent suivre les prescriptions de la documentation valide correspondant à l’épaisseur et à la référence livrées. Échafaudage et pose restent des postes distincts.'
      WHEN '2816745' THEN 'Panneau de polystyrène expansé graphité KNAUF XTherm ITEx Sun+, épaisseur 140 mm, R = 4,50 m²·K/W, λ = 0,031 W/(m·K). À intégrer à un système ITE compatible et documenté pour la référence exacte. La préparation du support, les profils, fixations, trame, sous-enduit et finition sont à réaliser selon les prescriptions du système retenu. Échafaudage, fourniture de finition et pose sont chiffrés séparément.'
      WHEN '231110' THEN 'Panneau de fibre de bois SOPREMA Pavawall Smart, épaisseur 145 mm, R = 3,70 m²·K/W, λ = 0,039 W/(m·K). Produit à mettre en œuvre exclusivement dans la configuration ITE et avec les composants autorisés par la documentation fabricant valide. Vérifier notamment le support admissible, le mode de fixation, la protection contre l’humidité et la finition compatible. Échafaudage, enduit et pose font l’objet de lignes séparées.'
      WHEN '102713' THEN 'Panneau de laine de roche ROCKWOOL Rockfaçade, épaisseur 130 mm, R = 3,70 m²·K/W, λ = 0,035 W/(m·K). Vérifier le domaine d’emploi exact de cette référence : les panneaux de façade ventilée ne sont pas automatiquement adaptés à un système sous enduit. La composition finale doit être conforme au système évalué et aux prescriptions fabricant. Échafaudage, parement et pose sont chiffrés séparément.'
      WHEN '100545' THEN 'Panneau de laine de roche ROCKWOOL Rockfaçade, épaisseur 150 mm, R = 4,25 m²·K/W, λ = 0,035 W/(m·K). Confirmer dans la documentation fabricant le domaine d’emploi, la fixation et la compatibilité avec le parement de façade choisi. Ne pas assimiler une façade ventilée à une ITE sous enduit sans justification du système complet. Échafaudage, parement et pose sont chiffrés séparément.'
      WHEN '346881' THEN 'Panneau de laine de roche ROCKWOOL Rockfaçade Premium, épaisseur 120 mm, R = 3,75 m²·K/W, λ = 0,032 W/(m·K). Le domaine d’emploi de la référence exacte doit être confirmé dans la fiche technique et le document d’évaluation du système de façade choisi. La pose et les éléments de finition doivent respecter les prescriptions applicables. Échafaudage, parement et pose sont des postes distincts.'
      WHEN '656159' THEN 'Rouleau de laine de verre KNAUF Insulation Smartfaçade 32 BR, épaisseur 120 mm, R = 3,75 m²·K/W, λ = 0,032 W/(m·K). Vérifier le domaine d’emploi de cette référence dans la documentation Knauf Insulation, notamment si elle est destinée à une façade ventilée. Elle ne doit pas être chiffrée comme système sous enduit sans validation explicite. Échafaudage, parement et pose sont chiffrés séparément.'
      WHEN '656234' THEN 'Rouleau de laine de verre KNAUF Insulation Smartfaçade 35 BR, épaisseur 140 mm, R = 4,00 m²·K/W, λ = 0,035 W/(m·K). Vérifier le domaine d’emploi exact et la composition de façade admise par la documentation fabricant avant de retenir cette référence. Le système de fixation, la protection extérieure et la finition doivent correspondre à la configuration validée. Échafaudage, parement et pose sont des postes séparés.'
      ELSE description END,
    caracteristiques = COALESCE(cp.caracteristiques,'{}'::jsonb) || jsonb_build_object(
      'prix_fourniture_ht_m2', t.prix,
      'prix_pose_ht_m2', 50,
      'pose_generee_comme_ligne_separee', true,
      'composition_devis_ite', jsonb_build_array('échafaudage','isolant','enduit ou parement compatible','pose'),
      'source_tarif', 'Tarifs fournis par Reno Soluces le 20/10/2026',
      'prix_a_renseigner', (t.prix = 0)
    )
FROM tarifs t
WHERE cp.categorie = 'ite'
  AND (cp.reference = t.reference OR lower(cp.nom) = lower(t.nom));

-- IsolFrance TH31 : entrée fournie par Reno Soluces, absente de la migration initiale.
INSERT INTO catalogue_produits (
  entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
  prix_unitaire_ht,forfait_pose_ht,forfait_evacuation_ht,unite,tva_taux,
  eligible_mpr,eligible_cee,fiche_cee,actif,public_cible,catalogue_groupe
)
SELECT e.id,'ite','Panneau PSE graphité IsolFrance TH31 — 120 mm','IsolFrance','ISOLFRANCE-TH31-120',
  'Panneau de polystyrène expansé graphité IsolFrance TH31, épaisseur 120 mm, R = 3,80 m²·K/W selon les données communiquées. La conductivité λ et les certifications/évaluations applicables doivent être reprises de la fiche officielle correspondant à la référence exacte. Pour une ITE sous enduit, utiliser un système complet validé avec ses accessoires, fixations, trame, sous-enduit et finition. Échafaudage, enduit et pose sont chiffrés séparément.',
  '{"type_isolant":"PSE graphité","epaisseur_mm":120,"resistance_thermique_R_m2K_W":3.8,"mode_pose":"ITE sous enduit — système complet à vérifier","prix_fourniture_ht_m2":11,"prix_pose_ht_m2":50,"pose_generee_comme_ligne_separee":true,"source_tarif":"Tarif fourni par Reno Soluces le 20/10/2026","certifications_a_verifier":true,"composition_devis_ite":["échafaudage","isolant","enduit ou parement compatible","pose"]}'::jsonb,
  11,50,0,'m2',20,false,false,'',true,'particulier','particulier'
FROM entreprises e
WHERE NOT EXISTS (SELECT 1 FROM catalogue_produits cp WHERE cp.categorie='ite' AND cp.reference='ISOLFRANCE-TH31-120')
ORDER BY e.created_at LIMIT 1;

UPDATE catalogue_produits
SET categorie='ite', marque='IsolFrance', nom='Panneau PSE graphité IsolFrance TH31 — 120 mm',
    description='Panneau de polystyrène expansé graphité IsolFrance TH31, épaisseur 120 mm, R = 3,80 m²·K/W selon les données communiquées. La conductivité λ et les certifications/évaluations applicables doivent être reprises de la fiche officielle correspondant à la référence exacte. Pour une ITE sous enduit, utiliser un système complet validé avec ses accessoires, fixations, trame, sous-enduit et finition. Échafaudage, enduit et pose sont chiffrés séparément.',
    prix_unitaire_ht=11, forfait_pose_ht=50, forfait_evacuation_ht=0, unite='m2',
    caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || '{"type_isolant":"PSE graphité","epaisseur_mm":120,"resistance_thermique_R_m2K_W":3.8,"prix_fourniture_ht_m2":11,"prix_pose_ht_m2":50,"pose_generee_comme_ligne_separee":true,"certifications_a_verifier":true}'::jsonb
WHERE categorie='ite' AND reference='ISOLFRANCE-TH31-120';

-- S'assurer que les prestations de composition restent disponibles séparément.
UPDATE catalogue_produits
SET categorie='ite', public_cible='particulier', catalogue_groupe='particulier', actif=true,
    prix_unitaire_ht=24, forfait_pose_ht=0, forfait_evacuation_ht=0,
    description='Prestation d’échafaudage de façade : montage, location et démontage, avec protections collectives adaptées. Quantité à renseigner selon la surface réellement échafaudée ; elle peut différer de la surface isolée. Vérifier l’accès, la hauteur, les ancrages et les contraintes du chantier. Ligne distincte de l’isolant, de l’enduit et de la pose de l’ITE.'
WHERE reference='FAC_ECHAFAUDAGE' OR nom ILIKE 'Échafaudage de façade%';

UPDATE catalogue_produits
SET categorie='ite', public_cible='particulier', catalogue_groupe='particulier', actif=true,
    prix_unitaire_ht=72, forfait_pose_ht=0, forfait_evacuation_ht=0,
    description='Prestation d’enduit de façade monocouche teinté dans la masse, finition grattée, prix de fourniture/prestation selon le tarif catalogue transmis. Préparation et compatibilité du support à contrôler ; application suivant la documentation du fabricant et le NF DTU applicable au chantier. À retenir uniquement si cette finition est compatible avec le système ITE sélectionné. Échafaudage et pose de l’isolant sont chiffrés séparément.'
WHERE reference='FAC_ENDUIT' OR nom ILIKE 'Enduit de façade monocouche%';

-- Les entrées génériques ne doivent pas remplacer les quatre composants détaillés du devis ITE.
-- Conservation des fiches pour l'historique, mais désactivation des doublons génériques.
UPDATE catalogue_produits
SET actif=false,
    caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || '{"remplace_par_composition_ite":true}'::jsonb
WHERE categorie='ite'
  AND (reference IN ('ITE','ITE-PRODUIT') OR upper(reference) IN ('ITE','ITE-PRODUIT') OR upper(trim(nom)) IN ('ITE','ITE-PRODUIT'));

-- ITINJECTION correspond à une technique d'injection et ne doit pas être présentée comme un panneau ITE.
UPDATE catalogue_produits
SET categorie='murs', public_cible='particulier', catalogue_groupe='particulier',
    caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || '{"technique_distincte_de_l_ite_sous_enduit":true}'::jsonb
WHERE upper(reference)='ITINJECTION' OR upper(trim(nom))='ITINJECTION';

COMMIT;
