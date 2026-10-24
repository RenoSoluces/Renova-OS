/* Renova OS — Systèmes solaires combinés (SSC) (catalogue partenaire du 23/10/2026).

   5 références : Sans marque 1, Ecoya 1, Thermador 1, De Dietrich 1, Chappée 1.

   Règles :
     - Rejouable : correspondance par référence du catalogue partenaire, ou par l'ancienne référence
       de la migration du 19/10/2026 (ex. SSC-ECOYA → SYSTEME_SOLAIRE_COMBINE_ECOYA) ; aucun doublon créé. L'ancienne
       référence est conservée dans caracteristiques.ancienne_reference.
     - Prix partenaire (HT) appliqué quand il est renseigné ; « Prix à renseigner » ou 0,00 € HT = prix existant
       conservé (ou 0 + caracteristiques.prix_a_renseigner pour une nouvelle référence).
     - Forfaits de pose / évacuation jamais modifiés ; unité conservée sur une ligne existante ;
       description remplacée seulement si vide ou brute ; nom conservé sur une ligne existante
       quand le libellé partenaire n'est qu'un code (nom_brut).
     - BAR-TH-143, CEE oui, MaPrimeRénov' oui (comme les SSC déjà en catalogue), TVA 5,5 %.
     - Les aides et la fiche CEE sont indicatives : à confirmer avec la fiche en vigueur, le délégataire et le dossier. */
DO $$
DECLARE
  v_entreprise uuid;
  p jsonb;
  v_id uuid;
  v_aliases text[];
  v_ajoutes int := 0;
  v_maj int := 0;
  v_doublons int := 0;
BEGIN
  SELECT id INTO v_entreprise FROM public.entreprises ORDER BY created_at LIMIT 1;
  IF v_entreprise IS NULL THEN
    RAISE NOTICE 'Aucune entreprise : aucun produit SSC traité';
    RETURN;
  END IF;

  FOR p IN SELECT value FROM jsonb_array_elements($produits$[{"nom": "SSC — PACK F — 4 PV", "nom_brut": true, "marque": "", "reference": "SSC_PACK_F_4_PV", "aliases": ["SSC-PACK-F-4-PV"], "prix_unitaire_ht": null, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "prix_a_renseigner": true, "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Système solaire combiné (SSC)."}, {"nom": "Système solaire combiné Ecoya", "nom_brut": true, "marque": "Ecoya", "reference": "SYSTEME_SOLAIRE_COMBINE_ECOYA", "aliases": ["SSC-ECOYA"], "prix_unitaire_ht": 11160.0, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"famille": "Système solaire combiné (SSC)", "classe_energetique": "A", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Ecoya · Système solaire combiné (SSC) · classe A."}, {"nom": "Système solaire combiné Thermador Astrea Pack Ithéon (PSOLSCE44) : ballon double cuve 480 L (300 L sanitaire + 180 L chauffage), 4 capteurs PSOL25VM, résistance 3 kW", "nom_brut": false, "marque": "Thermador", "reference": "SSC-THERMADOR-ASTREA-ITHEON-480", "aliases": [], "prix_unitaire_ht": 9200.0, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"code_article": "PSOLSCE44", "nb_capteurs": 4, "volume_l": 480.0, "volume_sanitaire_l": 300.0, "volume_chauffage_l": 180.0, "appoint_kw": 3.0, "famille": "Système solaire combiné (SSC)", "classe_energetique": "C", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Thermador · Système solaire combiné (SSC) · ballon 480 L · 4 capteurs · classe C."}, {"nom": "Système solaire combiné De Dietrich Dietrisol Quadro 700 SolarSystem (7805656) avec pack toit 4 capteurs D 230 TB 9 m² (7854360), crochet universel tuiles mécaniques", "nom_brut": false, "marque": "De Dietrich", "reference": "SSC-DD-QUADRO700-4-D230TB", "aliases": ["SSC-DEDIETRICH-QUADRO700"], "prix_unitaire_ht": 12096.7, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"code_article": "7805656", "codes_articles": ["7805656", "7854360"], "nb_capteurs": 4, "surface_capteurs_m2": 9.0, "famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "De Dietrich · Système solaire combiné (SSC) · 4 capteurs · 9 m²."}, {"nom": "Système solaire combiné Chappée SSC WSC 400 (402 L) avec 4 capteurs SOL 200 LH (8,08 m² hors-tout), station solaire WSC, montage tuiles mécaniques à la verticale", "nom_brut": false, "marque": "Chappée", "reference": "SSC-CHAPPEE-WSC400-4-SOL200LH", "aliases": ["SSC-CHAPPEE-WSC400"], "prix_unitaire_ht": 9972.4, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"nb_capteurs": 4, "surface_capteurs_m2": 8.08, "volume_l": 402.0, "famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Chappée · Système solaire combiné (SSC) · ballon 402 L · 4 capteurs · 8,08 m²."}]$produits$::jsonb) LOOP
    v_aliases := ARRAY(SELECT jsonb_array_elements_text(p->'aliases'));

    SELECT id INTO v_id
    FROM public.catalogue_produits
    WHERE entreprise_id = v_entreprise
      AND (reference = p->>'reference' OR reference = ANY(v_aliases))
    ORDER BY (reference = p->>'reference') DESC, actif DESC, created_at NULLS LAST
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO public.catalogue_produits (
        entreprise_id, categorie, nom, marque, reference, description, caracteristiques,
        prix_unitaire_ht, unite, tva_taux, eligible_mpr, eligible_cee, fiche_cee, actif,
        public_cible, catalogue_groupe, forfait_pose_ht, forfait_evacuation_ht
      ) VALUES (
        v_entreprise, 'ssc', p->>'nom', COALESCE(p->>'marque', ''), p->>'reference',
        COALESCE(p->>'description', ''), COALESCE(p->'caracteristiques', '{}'::jsonb),
        COALESCE(NULLIF(p->>'prix_unitaire_ht', '')::numeric, 0),
        COALESCE(p->>'unite', 'unite'), 5.5,
        COALESCE((p->>'eligible_mpr')::boolean, false), COALESCE((p->>'eligible_cee')::boolean, false),
        COALESCE(p->>'fiche_cee', ''), true, 'particulier', 'particulier', 0, 0
      );
      v_ajoutes := v_ajoutes + 1;
    ELSE
      UPDATE public.catalogue_produits SET
        categorie = 'ssc',
        nom = CASE WHEN COALESCE((p->>'nom_brut')::boolean, false) THEN nom ELSE p->>'nom' END,
        marque = COALESCE(NULLIF(p->>'marque', ''), marque),
        reference = p->>'reference',
        description = CASE
          WHEN COALESCE(btrim(description), '') = ''
            OR description = nom
            OR description = p->>'nom'
          THEN p->>'description'
          ELSE description
        END,
        caracteristiques = (COALESCE(caracteristiques, '{}'::jsonb) - 'prix_a_renseigner'::text)
                           || ((p->'caracteristiques') - 'prix_a_renseigner'::text)
                           || CASE WHEN array_length(v_aliases, 1) > 0 AND reference = ANY(v_aliases)
                                THEN jsonb_build_object('ancienne_reference', reference)
                                ELSE '{}'::jsonb END,
        prix_unitaire_ht = COALESCE(NULLIF(p->>'prix_unitaire_ht', '')::numeric, prix_unitaire_ht),
        tva_taux = 5.5,
        eligible_mpr = COALESCE((p->>'eligible_mpr')::boolean, false),
        eligible_cee = COALESCE((p->>'eligible_cee')::boolean, false),
        fiche_cee = COALESCE(p->>'fiche_cee', ''),
        actif = true
      WHERE id = v_id;
      v_maj := v_maj + 1;
    END IF;

    -- Autres lignes portant l'ancienne référence (doublons probables) : laissées actives, à confirmer.
    IF array_length(v_aliases, 1) > 0 THEN
      SELECT v_doublons + count(*) INTO v_doublons
      FROM public.catalogue_produits
      WHERE entreprise_id = v_entreprise AND reference = ANY(v_aliases) AND id <> COALESCE(v_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
    v_id := NULL;
  END LOOP;

  -- Drapeau « prix à renseigner » aligné sur le prix réellement présent.
  UPDATE public.catalogue_produits
  SET caracteristiques = CASE
    WHEN COALESCE(prix_unitaire_ht, 0) > 0 THEN caracteristiques - 'prix_a_renseigner'::text
    ELSE caracteristiques || '{"prix_a_renseigner": true}'::jsonb
  END
  WHERE entreprise_id = v_entreprise
    AND categorie = 'ssc'
    AND reference IN (SELECT value->>'reference' FROM jsonb_array_elements($produits$[{"nom": "SSC — PACK F — 4 PV", "nom_brut": true, "marque": "", "reference": "SSC_PACK_F_4_PV", "aliases": ["SSC-PACK-F-4-PV"], "prix_unitaire_ht": null, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "prix_a_renseigner": true, "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Système solaire combiné (SSC)."}, {"nom": "Système solaire combiné Ecoya", "nom_brut": true, "marque": "Ecoya", "reference": "SYSTEME_SOLAIRE_COMBINE_ECOYA", "aliases": ["SSC-ECOYA"], "prix_unitaire_ht": 11160.0, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"famille": "Système solaire combiné (SSC)", "classe_energetique": "A", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Ecoya · Système solaire combiné (SSC) · classe A."}, {"nom": "Système solaire combiné Thermador Astrea Pack Ithéon (PSOLSCE44) : ballon double cuve 480 L (300 L sanitaire + 180 L chauffage), 4 capteurs PSOL25VM, résistance 3 kW", "nom_brut": false, "marque": "Thermador", "reference": "SSC-THERMADOR-ASTREA-ITHEON-480", "aliases": [], "prix_unitaire_ht": 9200.0, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"code_article": "PSOLSCE44", "nb_capteurs": 4, "volume_l": 480.0, "volume_sanitaire_l": 300.0, "volume_chauffage_l": 180.0, "appoint_kw": 3.0, "famille": "Système solaire combiné (SSC)", "classe_energetique": "C", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Thermador · Système solaire combiné (SSC) · ballon 480 L · 4 capteurs · classe C."}, {"nom": "Système solaire combiné De Dietrich Dietrisol Quadro 700 SolarSystem (7805656) avec pack toit 4 capteurs D 230 TB 9 m² (7854360), crochet universel tuiles mécaniques", "nom_brut": false, "marque": "De Dietrich", "reference": "SSC-DD-QUADRO700-4-D230TB", "aliases": ["SSC-DEDIETRICH-QUADRO700"], "prix_unitaire_ht": 12096.7, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"code_article": "7805656", "codes_articles": ["7805656", "7854360"], "nb_capteurs": 4, "surface_capteurs_m2": 9.0, "famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "De Dietrich · Système solaire combiné (SSC) · 4 capteurs · 9 m²."}, {"nom": "Système solaire combiné Chappée SSC WSC 400 (402 L) avec 4 capteurs SOL 200 LH (8,08 m² hors-tout), station solaire WSC, montage tuiles mécaniques à la verticale", "nom_brut": false, "marque": "Chappée", "reference": "SSC-CHAPPEE-WSC400-4-SOL200LH", "aliases": ["SSC-CHAPPEE-WSC400"], "prix_unitaire_ht": 9972.4, "unite": "forfait", "fiche_cee": "BAR-TH-143", "eligible_cee": true, "eligible_mpr": true, "caracteristiques": {"nb_capteurs": 4, "surface_capteurs_m2": 8.08, "volume_l": 402.0, "famille": "Système solaire combiné (SSC)", "source_tarifs": "Catalogue partenaire — liste fournie le 23/10/2026", "fiche_cee": "BAR-TH-143", "aides_a_verifier": true}, "description": "Chappée · Système solaire combiné (SSC) · ballon 402 L · 4 capteurs · 8,08 m²."}]$produits$::jsonb));

  RAISE NOTICE 'SSC : % ajouté(s), % mis à jour, % doublon(s) probable(s) laissé(s) actif(s)', v_ajoutes, v_maj, v_doublons;
END $$;
