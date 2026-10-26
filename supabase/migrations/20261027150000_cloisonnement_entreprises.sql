-- Cloisonnement des entreprises : aucune mention de l'entreprise interne dans les données
-- partagées (catalogue), et règles de prix internes réservées à sa direction.

-- 1. Sauvegarde des textes modifiés.
create table if not exists public.catalogue_textes_sauvegarde_20261027 as
  select id, description, caracteristiques, now() as sauvegarde_le from public.catalogue_produits
   where description ilike '%reno soluces%' or caracteristiques::text ilike '%reno soluces%';
alter table public.catalogue_textes_sauvegarde_20261027 enable row level security;

-- 2. Catalogue : on retire les mentions de provenance (source, tarif communiqué par…).
update public.catalogue_produits set caracteristiques =
  (select coalesce(jsonb_object_agg(k, case when jsonb_typeof(v) = 'string'
             then to_jsonb(regexp_replace(v #>> '{}', '\s*(fournies|fournis|fourni|communiqué|communiquées|indiqué|transmis) par Reno Soluces', ' \1 par le fabricant', 'gi'))
             else v end), '{}'::jsonb)
     from jsonb_each(caracteristiques) e(k, v)
    where not (k in ('source_catalogue', 'tarif_source', 'source_tarif') and (v #>> '{}') ilike '%reno soluces%'))
 where caracteristiques::text ilike '%reno soluces%';

update public.catalogue_produits set description = trim(regexp_replace(
         regexp_replace(description, '(^|\n)[^\n]*(Source Catalogue|Tarif|Source Tarif)[^\n]*Reno Soluces[^\n]*', '', 'gi'),
         '\s*(fournies|fournis|fourni|communiqué|communiquées|indiqué|transmis) par Reno Soluces', ' \1 par le fabricant', 'gi'))
 where description ilike '%reno soluces%';

-- 3. Règles de prix (coefficients, marges) : lecture réservée à la direction interne.
drop policy if exists "regles_tarifaires_lecture" on public.regles_tarifaires;
create policy "regles_tarifaires_lecture" on public.regles_tarifaires for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'manager')));
