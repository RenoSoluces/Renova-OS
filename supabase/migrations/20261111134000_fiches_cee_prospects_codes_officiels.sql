-- Les codes de fiches saisis sur les prospects suivaient d'anciens libellés erronés : on les remplace par les codes officiels.
create table if not exists public.prospects_fiches_cee_sauvegarde_20261111 as
  select id, fiches_cee from public.prospects where fiches_cee is not null and cardinality(fiches_cee) > 0;
alter table public.prospects_fiches_cee_sauvegarde_20261111 enable row level security;

update public.prospects p set fiches_cee = n.nouvelles
from (
  select p2.id,
         array(select distinct case c
           when 'BAR-EN-101' then 'BAR-EN-102'
           when 'BAR-EN-103' then 'BAR-EN-101'
           when 'BAR-EN-104' then 'BAR-EN-101'
           when 'BAR-EN-105' then 'BAR-EN-103'
           when 'BAR-TH-112' then 'BAR-TH-171'
           when 'BAR-TH-113' then 'BAR-TH-172'
           when 'BAR-TH-129' then 'BAR-TH-168'
           when 'BAR-VENT-132' then 'BAR-TH-125'
           when 'BAR-EN-104-FEN' then 'BAR-EN-104'
           else c end
         from unnest(p2.fiches_cee) as c) as nouvelles
  from public.prospects p2
  where p2.fiches_cee && array['BAR-EN-101','BAR-EN-103','BAR-EN-104','BAR-EN-105','BAR-TH-112','BAR-TH-113','BAR-TH-129','BAR-VENT-132','BAR-EN-104-FEN']
) n
where p.id = n.id;
