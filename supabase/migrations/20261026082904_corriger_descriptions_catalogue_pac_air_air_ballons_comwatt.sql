-- Sauvegarde des descriptions avant correction (accès bloqué : RLS sans politique)
create table if not exists public.catalogue_descriptions_sauvegarde_20261026 (
  id uuid primary key, description_avant text, sauvegarde_le timestamptz default now());
alter table public.catalogue_descriptions_sauvegarde_20261026 enable row level security;

insert into public.catalogue_descriptions_sauvegarde_20261026 (id, description_avant)
select id, description from public.catalogue_produits
where actif and (
  (categorie='pac_air_air' and description ilike '%isolation thermique des murs par l%')
  or (categorie='domotique' and reference='COMPACT-GEN4')
  or (categorie='ballon_thermodynamique' and length(coalesce(description,''))<60))
on conflict (id) do nothing;

-- 1) PAC air/air : description copiée d'un produit ITE -> texte PAC air/air, lignes parasites retirées
update public.catalogue_produits p set description =
  case when p.nom ilike 'Unité intérieure%'
    then 'Unité intérieure de pompe à chaleur air/air destinée au chauffage et, selon le modèle, au rafraîchissement, à raccorder à un groupe extérieur compatible (multi-split). La compatibilité avec le groupe extérieur et la configuration de l’installation doit être vérifiée avant la pose.'
    else 'Pompe à chaleur air/air destinée au chauffage et, selon le modèle, au rafraîchissement : unité intérieure et groupe extérieur fournis en set. La compatibilité avec l’installation et le dimensionnement doivent être vérifiés avant la pose.'
  end
  || E'\n' || regexp_replace(
       regexp_replace(substr(p.description, strpos(p.description, E'\n') + 1), E'(^|\n)Complements Ht : [^\n]*', '', 'g'),
       E'(^|\n)Résistance Thermique R : [^\n]*', '', 'g')
where p.actif and p.categorie='pac_air_air' and p.description ilike '%isolation thermique des murs par l%';

-- 2) Comwatt COMPACT : description de panneau PV remplacée
update public.catalogue_produits set description = regexp_replace(description,
  '^Équipement de production d’électricité à partir du rayonnement solaire, à intégrer à une installation dimensionnée selon le site et les besoins\.',
  'Gestionnaire d’énergie intelligent destiné à suivre la production et la consommation d’une installation photovoltaïque et à piloter les usages pour maximiser l’autoconsommation.')
where actif and categorie='domotique' and reference='COMPACT-GEN4';

-- 3) Ballons thermodynamiques : descriptions d'une ligne complétées avec les caractéristiques saisies
update public.catalogue_produits p set description =
  trim(both ' ' from
   case when coalesce(p.marque,'') in ('','Générique') then 'Chauffe-eau thermodynamique' else 'Chauffe-eau thermodynamique ' || p.marque end
   || case when p.caracteristiques->>'type_ballon' is not null then ' ' || (p.caracteristiques->>'type_ballon') else '' end
   || case when p.caracteristiques->>'volume_l' is not null then ' de ' || (p.caracteristiques->>'volume_l') || ' L' else '' end
   || ' pour la production d’eau chaude sanitaire à partir de l’air ambiant ou extérieur.')
  || E'\nProfil de soutirage : ' || coalesce(p.caracteristiques->>'Profil de soutirage','—')
  || E'\nEfficacité énergétique (ηwh) : ' || coalesce(p.caracteristiques->>'Efficacité énergétique','—') || ' %'
  || E'\nFiche CEE : ' || coalesce(p.caracteristiques->>'fiche_cee','BAR-TH-148')
  || E'\nLa compatibilité avec l’installation, le local d’implantation et l’évacuation des condensats doit être vérifiée avant la pose.'
where p.actif and p.categorie='ballon_thermodynamique' and length(coalesce(p.description,''))<60;
