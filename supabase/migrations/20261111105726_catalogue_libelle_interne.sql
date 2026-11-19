-- Libellé réservé à l'équipe interne (ex. « Idehome ») pour retrouver rapidement des produits ;
-- jamais affiché aux clients ni sur les devis.
alter table public.catalogue_produits add column if not exists libelle_interne text;
comment on column public.catalogue_produits.libelle_interne is 'Libellé réservé à l''équipe interne (ex. Idehome) ; jamais affiché aux clients ni sur les devis.';
update public.catalogue_produits set libelle_interne = 'Idehome'
 where reference in ('PANASONIC-MONO-20','PANASONIC-MONO-25','PANASONIC-MONO-35','PANASONIC-MONO-50','IDEHOME-PANASONIC-PLUSVALUE-BI','IDEHOME-PANASONIC-PLUSVALUE-TRI','ISO-COMBLE-ISOVER-H3-TRA','CONTOUR-TRAPPE-COMBLES','ECART-AU-FEU-COMBLES');
