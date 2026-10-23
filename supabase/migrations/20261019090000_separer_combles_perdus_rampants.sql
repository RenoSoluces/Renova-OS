-- Reno Soluces — séparation catalogue combles perdus / rampants, 19/10/2026.
-- Les anciennes références « combles » étaient les produits rampants fournis le 18/10.
-- Les catégories « murs » identifiées comme ITE sont reclassées en ITE.
-- Les tarifs combles perdus ci-dessous sont les prix installés HT communiqués par Reno Soluces,
-- TVA 5,5 %. Aucun forfait pose/déchets n'est ajouté pour éviter un double comptage.

UPDATE catalogue_produits
SET categorie = 'rampants'
WHERE categorie = 'combles';

UPDATE catalogue_produits
SET categorie = 'ite'
WHERE categorie = 'murs';

DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
BEGIN
  SELECT id INTO v_entreprise FROM entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise trouvée : produits combles perdus non insérés.';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($products$
  [
    {"reference":"COMBLES-PULSR-FORFAIT","nom":"Combles perdus — Forfait de base / Puls’R","marque":"Puls’R","description":"Isolation des combles perdus par soufflage. Prix installé communiqué par Reno Soluces, main-d’œuvre incluse. Confirmer la résistance thermique du système réellement posé avant de valider l’éligibilité aux aides.","prix_ht":30.00,"r":null,"type":"Soufflage laine en vrac"},
    {"reference":"ISOVER-COMBLISSIMO-R7","nom":"Isover Comblissimo — R=7","marque":"Isover","description":"Laine en vrac pour soufflage des combles perdus. Prix catalogue indicatif fourni + pose incluse, à confirmer selon chantier.","prix_ht":35.00,"r":7,"type":"Soufflage laine en vrac"},
    {"reference":"ROCKWOOL-JETROCK2-R7","nom":"Rockwool Jetrock 2 — R=7","marque":"Rockwool","description":"Laine en vrac pour soufflage des combles perdus. Prix catalogue indicatif fourni + pose incluse, à confirmer selon chantier.","prix_ht":34.50,"r":7,"type":"Soufflage laine en vrac"},
    {"reference":"URSA-PULSR47-R7","nom":"URSA Puls’R 47 — R=7","marque":"URSA","description":"Laine en vrac pour soufflage des combles perdus. Prix catalogue indicatif fourni + pose incluse, à confirmer selon chantier.","prix_ht":37.00,"r":7,"type":"Soufflage laine en vrac"},
    {"reference":"KNAUF-THERMOLOFT-R7","nom":"Knauf Insulation Thermo Loft — R=7","marque":"Knauf Insulation","description":"Laine en vrac pour soufflage des combles perdus. Prix catalogue indicatif fourni + pose incluse, à confirmer selon chantier.","prix_ht":29.50,"r":7,"type":"Soufflage laine en vrac"},
    {"reference":"SOPREMA-UNIVERCELL-CRISTAL-R7","nom":"Soprema Univercell Cristal — R=7","marque":"Soprema","description":"Ouate de cellulose en vrac pour soufflage des combles perdus. Prix catalogue indicatif fourni + pose incluse, à confirmer selon chantier.","prix_ht":28.00,"r":7,"type":"Soufflage ouate de cellulose"},
    {"reference":"VOLCALIS-EASY-LAINE-MINERALE","nom":"Volcalis Easy Laine Minérale","marque":"Volcalis","description":"Isolation des combles perdus par déroulage. Prix installé communiqué par Reno Soluces, pose incluse. Confirmer la résistance thermique du système réellement posé.","prix_ht":30.00,"r":null,"type":"Rouleaux au sol"},
    {"reference":"ISOVER-IBR-NU-300-R750","nom":"Isover IBR Nu — 300 mm (R=7,50)","marque":"Isover","description":"Rouleau de laine de verre nu pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":23.70,"r":7.5,"type":"Rouleaux au sol"},
    {"reference":"ISOVER-IBR-KRAFT-300-R750","nom":"Isover IBR Kraft — 300 mm (R=7,50)","marque":"Isover","description":"Rouleau de laine de verre kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":20.85,"r":7.5,"type":"Rouleaux au sol"},
    {"reference":"ISOVER-IBR-KRAFT-400-R1000","nom":"Isover IBR Kraft — 400 mm (R=10,00)","marque":"Isover","description":"Rouleau de laine de verre kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":30.00,"r":10,"type":"Rouleaux au sol"},
    {"reference":"URSA-MRK35-KRAFT-280-R800","nom":"URSA MRK 35 Kraft — 280 mm (R=8,00)","marque":"URSA","description":"Rouleau de laine minérale kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":31.55,"r":8,"type":"Rouleaux au sol"},
    {"reference":"URSA-MRK40-KRAFT-300-R750","nom":"URSA MRK 40 Kraft — 300 mm (R=7,50)","marque":"URSA","description":"Rouleau de laine minérale kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":19.90,"r":7.5,"type":"Rouleaux au sol"},
    {"reference":"KNAUF-TI212-KRAFT-280-R700","nom":"Knauf Insulation TI 212 Kraft — 280 mm (R=7,00)","marque":"Knauf Insulation","description":"Rouleau de laine minérale kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":25.60,"r":7,"type":"Rouleaux au sol"},
    {"reference":"KNAUF-TI212-KRAFT-300-R750","nom":"Knauf Insulation TI 212 Kraft — 300 mm (R=7,50)","marque":"Knauf Insulation","description":"Rouleau de laine minérale kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":18.75,"r":7.5,"type":"Rouleaux au sol"},
    {"reference":"KNAUF-TI216-KRAFT-370-R1000","nom":"Knauf Insulation TI 216 Kraft — 370 mm (R=10,00)","marque":"Knauf Insulation","description":"Rouleau de laine minérale kraft pour combles perdus. Prix installé communiqué par Reno Soluces, pose incluse.","prix_ht":24.25,"r":10,"type":"Rouleaux au sol"}
  ]
  $products$::jsonb) LOOP
    SELECT id INTO v_id FROM catalogue_produits WHERE entreprise_id = v_entreprise AND reference = p->>'reference' LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO catalogue_produits (
        entreprise_id,categorie,nom,marque,reference,description,caracteristiques,
        prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,
        public_cible,catalogue_groupe,forfait_pose_ht,forfait_evacuation_ht
      ) VALUES (
        v_entreprise,'combles_perdus',p->>'nom',p->>'marque',p->>'reference',p->>'description',
        jsonb_build_object('type_isolant',p->>'type','resistance_thermique_R_m2K_W',(p->>'r')::numeric,
          'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026','pose_incluse',true,
          'note_tarif','Prix installé indicatif communiqué par Reno Soluces ; aucun forfait de pose séparé.'),
        (p->>'prix_ht')::numeric,'m2',5.5,false,false,'',true,'particulier','particulier',0,0
      );
    ELSE
      UPDATE catalogue_produits SET categorie='combles_perdus', nom=p->>'nom', marque=p->>'marque',
        description=p->>'description', prix_unitaire_ht=(p->>'prix_ht')::numeric, unite='m2', tva_taux=5.5,
        caracteristiques=COALESCE(caracteristiques,'{}'::jsonb) || jsonb_build_object(
          'type_isolant',p->>'type','resistance_thermique_R_m2K_W',(p->>'r')::numeric,
          'prix_source','Tarif communiqué par Reno Soluces le 19/10/2026','pose_incluse',true,
          'note_tarif','Prix installé indicatif communiqué par Reno Soluces ; aucun forfait de pose séparé.'),
        eligible_mpr=false, eligible_cee=false, fiche_cee='', actif=true, public_cible='particulier',
        catalogue_groupe='particulier', forfait_pose_ht=0, forfait_evacuation_ht=0
      WHERE id=v_id;
    END IF;
    v_id := NULL;
  END LOOP;
END $$;
