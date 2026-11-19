-- Déjà appliqué sur Supabase (corrige le compteur « À compléter — tarifs » du catalogue).
-- Produits sans forfait de pose propre : pose comprise dans le prix / le groupe extérieur, ou facturée via un forfait dédié.
create table if not exists public.catalogue_caracteristiques_sauvegarde_20261026 as
select id, caracteristiques from public.catalogue_produits;
alter table public.catalogue_caracteristiques_sauvegarde_20261026 enable row level security;

update public.catalogue_produits p set caracteristiques = coalesce(p.caracteristiques,'{}'::jsonb)
  || jsonb_build_object('pose_separee','true','pose_info',
     case
       when p.categorie='pac_air_air' and p.nom ilike 'Unité intérieure%' then 'Pose comprise dans celle du groupe extérieur'
       when coalesce(p.caracteristiques->>'prix_inclut_pose','')='true' or p.nom ilike '%fourniture et pose%' then 'Pose comprise dans le prix'
       when p.marque in ('Main-d’œuvre','Accessoire') or p.nom ilike 'Forfait%' then 'Ligne de prestation / accessoire : pas de forfait de pose additionnel'
       when p.categorie='vmc' then 'Pose facturée via les forfaits pose VMC du catalogue'
       when p.categorie='ssc' then 'Pose facturée via les forfaits pose et mise en service SSC du catalogue'
       else 'Pas de pose spécifique' end)
where p.actif and coalesce(p.forfait_pose_ht,0)<=0 and coalesce(p.caracteristiques->>'pose_separee','')<>'true'
  and coalesce(p.catalogue_groupe,'')<>'visite_technique'
  and p.nom <> 'SSC — PACK F — 4 PV' and p.nom <> 'VMC SIMPLE FLUX'
  and not (p.categorie='solaire_thermique' and p.nom ilike '%Inisol Uno E BESL 300%')
  and ((p.categorie='pac_air_air' and p.nom ilike 'Unité intérieure%')
    or coalesce(p.caracteristiques->>'prix_inclut_pose','')='true'
    or p.nom ilike '%fourniture et pose%'
    or p.marque in ('Main-d’œuvre','Accessoire') or p.nom ilike 'Forfait%'
    or p.categorie in ('vmc','ssc')
    or p.reference='SMARTPLUG-GEN4');

update public.catalogue_produits set caracteristiques = coalesce(caracteristiques,'{}'::jsonb) || '{"pose_separee":"true","pose_info":"Forfait : fourniture et pose comprises"}'::jsonb
where actif and nom='VMC SIMPLE FLUX' and unite='forfait' and coalesce(forfait_pose_ht,0)<=0;

update public.catalogue_produits set forfait_pose_ht = 1250,
  caracteristiques = coalesce(caracteristiques,'{}'::jsonb) || '{"prix_estime": true, "prix_estime_date": "2026-10-26"}'::jsonb
where actif and categorie='solaire_thermique' and nom ilike '%Inisol Uno E BESL 300%' and coalesce(forfait_pose_ht,0)<=0;

update public.catalogue_produits set forfait_pose_ht=1400,
  caracteristiques = coalesce(caracteristiques,'{}'::jsonb) || '{"prix_estime": true, "prix_estime_date": "2026-10-26"}'::jsonb
where actif and reference in ('MHI-SCM71ZS-W','MHI-SCM80ZS-W') and coalesce(forfait_pose_ht,0)<=0;

update public.catalogue_produits set caracteristiques = coalesce(caracteristiques,'{}'::jsonb) || '{"famille":"Micro-onduleur photovoltaïque","unite_de_vente":"par panneau"}'::jsonb
where actif and reference='GEN-MICRO-ONDULEUR-ENPHASE';
update public.catalogue_produits set caracteristiques = coalesce(caracteristiques,'{}'::jsonb) || '{"type_menuiserie":"accessoire","famille":"Volet roulant isolant"}'::jsonb
where actif and categorie='menuiseries' and nom='Volet roulant isolant' and not (caracteristiques ? 'type_menuiserie');
