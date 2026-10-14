-- Adresse définitive d'IDEHOME, pour les fiches partenaires utilisées à l'écran et les nouveaux devis.
UPDATE public.installateurs
SET adresse = '8 Rue Mermoz', code_postal = '34430', ville = 'Saint-Jean-de-Védas'
WHERE lower(coalesce(nom,'')) LIKE '%idehome%'
   OR lower(coalesce(devis_nom_affichage,'')) LIKE '%idehome%'
   OR lower(coalesce(devis_raison_sociale,'')) LIKE '%idehome%';
