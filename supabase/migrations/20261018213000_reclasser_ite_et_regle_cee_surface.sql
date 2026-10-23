-- Reno Soluces / Renova OS — reclassement ITE et règle de prime CEE au m².
-- À appliquer sur le projet Supabase Renova OS cible après vérification.
BEGIN;
UPDATE catalogue_produits
SET categorie = 'ite',
    public_cible = 'particulier',
    catalogue_groupe = 'particulier'
WHERE categorie IN ('autre','murs','ite')
  AND (
    reference IN (
      'PRB FACADE TH 38','ITE','ITE-PRODUIT',
      '239630','235043','35343','13056','87220','2816688','2816743','2816745',
      '231110','102713','100545','346881','656234','656159'
    )
    OR nom ILIKE '%THERMOLOOK EMI ANCIEN%'
    OR nom ILIKE '%Ecorock Mono%'
    OR nom ILIKE '%Efigreen ITE%'
    OR nom ILIKE '%Graphipan ITE%'
    OR nom ILIKE '%Isofaçade%'
    OR nom ILIKE '%ITEx%'
    OR nom ILIKE '%Pavawall Smart%'
    OR nom ILIKE '%Rockfaçade%'
    OR nom ILIKE '%Smartfaçade%'
  );

-- Les deux prestations de façade doivent rester dans la catégorie ITE afin d'apparaître
-- sous le bandeau ITE du devis, mais elles ne sont pas incluses dans la surface aidée.
UPDATE catalogue_produits
SET categorie = 'ite', public_cible = 'particulier', catalogue_groupe = 'particulier'
WHERE reference IN ('FAC_ECHAFAUDAGE','FAC_ENDUIT');
COMMIT;
