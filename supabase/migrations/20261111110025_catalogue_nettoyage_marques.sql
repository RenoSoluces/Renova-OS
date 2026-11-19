-- Nettoyage des marques : doublons de casse fusionnés, valeurs qui ne sont pas des marques retirées.
create table if not exists public.catalogue_marques_sauvegarde_20261111 as
  select id, marque, caracteristiques from public.catalogue_produits;
alter table public.catalogue_marques_sauvegarde_20261111 enable row level security;

update public.catalogue_produits set marque = 'Aline' where marque = 'ALINE';
update public.catalogue_produits set marque = 'Isover' where marque = 'ISOVER';
update public.catalogue_produits set marque = 'K•Line' where marque in ('K-Line', 'K•LINE');

-- Matières saisies à la place de la marque : on les garde dans les caractéristiques.
update public.catalogue_produits
   set caracteristiques = coalesce(caracteristiques, '{}'::jsonb) || jsonb_build_object('matiere', marque), marque = ''
 where marque in ('PVC', 'Bois', 'Aluminium', 'Bois-aluminium');

-- Valeurs d'attente ou notes de prix : ce ne sont pas des marques (le catalogue signale déjà les marques manquantes).
update public.catalogue_produits set marque = '' where marque in ('À préciser', 'À renseigner', 'Estimation marché');
