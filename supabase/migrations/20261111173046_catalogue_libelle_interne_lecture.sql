-- La colonne libelle_interne (ajoutée le 11/11/2026) n'avait pas reçu le droit de lecture
-- par colonne : la page Catalogue, qui la demande, recevait un refus et s'affichait vide.
grant select (libelle_interne) on public.catalogue_produits to authenticated;
