-- Checklist administrative demandée pour les dossiers CEE Reno Soluces.
-- Le devis signé reste conservé séparément lorsqu'un dossier est ouvert depuis un devis signé.
UPDATE public.documents
SET nom = 'Avis d’impôts (avis d’imposition)'
WHERE type = 'avis_imposition';

UPDATE public.documents
SET nom = 'Carte nationale d’identité (CNI)'
WHERE type = 'piece_identite';

UPDATE public.documents
SET nom = 'Photos avant travaux'
WHERE type IN ('photos', 'photos_avant');

-- Description technique du produit URSA Puls’R 47.
-- La surface de 86 m² est donnée comme surface indicative à adapter au chantier.
-- Puls’R 47 est une laine minérale en vrac, et non une ouate de cellulose : le type est formulé en conséquence.
UPDATE public.catalogue_produits
SET description = E'Réf. : PULS R 47\nMarque : URSA\nGamme : PULS R 47\nType : laine minérale en vrac pour soufflage\nÉpaisseur indicative : 335 mm\nSurface indicative : 86 m² (à adapter à la surface réelle du chantier)\nCE : produit relevant de la norme européenne NF EN 14064-1:2010, à confirmer sur la documentation correspondant à la référence livrée\nDTA : 20/13/299_V2 (référence à vérifier sur le document fabricant applicable)\nACERMI : 163-CPR-0366 (certificat à vérifier pour la référence livrée)\nClassement sanitaire : A+ (à confirmer sur la fiche sanitaire)\nRésistance thermique visée : R > 7 m²·K/W, à confirmer selon l’épaisseur et la masse volumique effectivement mises en œuvre.\n\nMise en œuvre et points de contrôle : la nécessité d’un pare-vapeur doit être déterminée selon la configuration du plancher et les prescriptions applicables ; réalisation d’un écart au feu autour des conduits produisant de la chaleur ; réalisation du contour de trappe ; coffrage/suspension de la VMC non requis uniquement si la configuration le permet et conformément aux prescriptions ; pose d’une pige de repérage ; repérage et protection des points électriques et des éclairages encastrés ; réhausse rigide et isolation de la trappe d’accès. La surface effectivement isolée doit représenter au moins 75 % de la surface à isoler, sous réserve des conditions de la fiche CEE applicable.'
WHERE reference IN ('URSA-PULSR47-R7', 'COMBLES-PULSR-FORFAIT');

-- Remplacer l'ancien type photos_avant par le type utilisé par l'interface dossier.
UPDATE public.documents
SET type = 'photos'
WHERE type = 'photos_avant';


-- Compléter également les dossiers déjà ouverts avec les pièces désormais attendues.
INSERT INTO public.documents (dossier_id, prospect_id, nom, type, categorie, recu)
SELECT d.id, d.prospect_id, piece.nom, piece.type, piece.categorie, false
FROM public.dossiers d
CROSS JOIN (VALUES
  ('Avis d’impôts (avis d’imposition)', 'avis_imposition', 'Administratif'),
  ('Taxe foncière', 'taxe_fonciere', 'Administratif'),
  ('Carte nationale d’identité (CNI)', 'piece_identite', 'Administratif'),
  ('Justificatif de domicile', 'justificatif_domicile', 'Administratif'),
  ('Photos avant travaux', 'photos', 'Technique')
) AS piece(nom, type, categorie)
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents doc
  WHERE doc.dossier_id = d.id AND doc.type = piece.type
);
