-- Tarification : prix d'achat (caché aux commerciaux), prix de vente conseillé, prix plancher,
-- consommables détaillés, et règles par catégorie (coefficient, pose, dépose, consommables, marge minimale).
alter table public.catalogue_produits add column if not exists prix_achat_ht numeric;
alter table public.catalogue_produits add column if not exists prix_conseille_ht numeric;
alter table public.catalogue_produits add column if not exists prix_plancher_ht numeric;
alter table public.catalogue_produits add column if not exists consommables_detail jsonb not null default '[]'::jsonb;

-- Les prix actuels du catalogue sont des prix d'achat fournisseur : on les conserve comme prix d'achat.
update public.catalogue_produits set prix_achat_ht = prix_unitaire_ht where prix_achat_ht is null;

-- Droits par colonne : le prix d'achat n'est pas lisible par les utilisateurs (lecture via fonction réservée).
grant select (prix_conseille_ht, prix_plancher_ht, consommables_detail) on public.catalogue_produits to authenticated;
grant insert (prix_conseille_ht, prix_plancher_ht, consommables_detail, prix_achat_ht) on public.catalogue_produits to authenticated;
grant update (prix_conseille_ht, prix_plancher_ht, consommables_detail, prix_achat_ht) on public.catalogue_produits to authenticated;

create table if not exists public.regles_tarifaires (
  categorie text primary key,
  coef_fourniture numeric not null default 1.35 check (coef_fourniture between 0.5 and 5),
  pose_defaut_ht numeric not null default 0,
  depose_defaut_ht numeric not null default 0,
  consommables jsonb not null default '[]'::jsonb,
  marge_min_pct numeric not null default 15 check (marge_min_pct between 0 and 200),
  notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.regles_tarifaires enable row level security;
drop policy if exists regles_tarifaires_lecture on public.regles_tarifaires;
create policy regles_tarifaires_lecture on public.regles_tarifaires for select to authenticated using (true);
drop policy if exists regles_tarifaires_ecriture on public.regles_tarifaires;
create policy regles_tarifaires_ecriture on public.regles_tarifaires for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
grant select, insert, update, delete on public.regles_tarifaires to authenticated;

-- Valeurs de départ (HT), à ajuster dans Catalogue → Tarification.
insert into public.regles_tarifaires (categorie, coef_fourniture, pose_defaut_ht, depose_defaut_ht, consommables, marge_min_pct, notes) values
 ('pac_air_eau', 1.35, 2400, 450, '[{"libelle":"Liaisons hydrauliques et frigorifiques, raccords","quantite":1,"unite":"forfait","prix_ht":180},{"libelle":"Supports, plots anti-vibratiles, dalle ou console","quantite":1,"unite":"forfait","prix_ht":120},{"libelle":"Câblage et protection électrique","quantite":1,"unite":"forfait","prix_ht":150},{"libelle":"Filtre magnétique / pot à boue, désembouage","quantite":1,"unite":"forfait","prix_ht":150},{"libelle":"Mise en service et réglages","quantite":1,"unite":"forfait","prix_ht":200}]', 18, 'Dépose = ancienne chaudière fioul ou gaz.'),
 ('pac_air_air', 1.35, 900, 0, '[{"libelle":"Liaison frigorifique isolée (jusqu’à 5 m)","quantite":1,"unite":"forfait","prix_ht":90},{"libelle":"Support mural ou au sol du groupe extérieur","quantite":1,"unite":"forfait","prix_ht":50},{"libelle":"Goulotte et évacuation des condensats","quantite":1,"unite":"forfait","prix_ht":60},{"libelle":"Câblage et protection électrique","quantite":1,"unite":"forfait","prix_ht":70},{"libelle":"Tirage au vide et mise en service","quantite":1,"unite":"forfait","prix_ht":80}]', 15, 'La pose déjà renseignée sur un produit est conservée.'),
 ('ballon_thermodynamique', 1.35, 500, 120, '[{"libelle":"Groupe de sécurité et raccords diélectriques","quantite":1,"unite":"forfait","prix_ht":45},{"libelle":"Flexibles, raccords et calorifugeage","quantite":1,"unite":"forfait","prix_ht":40},{"libelle":"Évacuation des condensats","quantite":1,"unite":"forfait","prix_ht":25}]', 15, 'Dépose = ancien cumulus électrique.'),
 ('solaire_thermique', 1.35, 1900, 120, '[{"libelle":"Liaisons solaires, fluide caloporteur","quantite":1,"unite":"forfait","prix_ht":220},{"libelle":"Kit de fixation toiture et étanchéité","quantite":1,"unite":"forfait","prix_ht":150}]', 15, ''),
 ('ssc', 1.3, 0, 0, '[]', 15, 'Pose via les forfaits SSC du catalogue.'),
 ('pac_geothermie', 1.3, 0, 450, '[]', 15, 'Forage et captage à chiffrer à part.'),
 ('vmc', 1.4, 0, 60, '[{"libelle":"Gaines isolées, colliers et manchons","quantite":1,"unite":"forfait","prix_ht":80},{"libelle":"Câblage et commande","quantite":1,"unite":"forfait","prix_ht":40}]', 18, 'Pose via les forfaits VMC du catalogue. Dépose = ancien caisson.'),
 ('menuiseries', 1.6, 220, 60, '[{"libelle":"Mousse, joints et calfeutrement","quantite":1,"unite":"forfait","prix_ht":20},{"libelle":"Habillage et finitions","quantite":1,"unite":"forfait","prix_ht":30}]', 20, 'Prix par menuiserie.'),
 ('menuiseries_portes', 1.6, 280, 80, '[{"libelle":"Mousse, joints et calfeutrement","quantite":1,"unite":"forfait","prix_ht":25},{"libelle":"Seuil et habillage","quantite":1,"unite":"forfait","prix_ht":40}]', 20, ''),
 ('combles_perdus', 1, 0, 0, '[]', 15, 'Prix au m² déjà fourniture et pose : coefficient 1 par défaut.'),
 ('rampants', 1, 0, 0, '[]', 15, 'Prix au m², vérifier si la pose est incluse.'),
 ('ite', 1, 0, 0, '[]', 15, 'Prix au m², vérifier si la pose est incluse.'),
 ('plancher', 1, 0, 0, '[]', 15, 'Prix au m², vérifier si la pose est incluse.'),
 ('photovoltaique', 1, 0, 0, '[]', 12, 'Packs déjà en prix d’installation posée.'),
 ('batterie_stockage', 1, 0, 0, '[]', 12, 'Prix posés.')
on conflict (categorie) do nothing;

-- Lecture du prix d'achat réservée à l'administration et aux managers.
create or replace function public.catalogue_prix_achat()
returns table (id uuid, prix_achat_ht numeric)
language sql stable security definer set search_path to 'public' as $$
  select c.id, c.prix_achat_ht from public.catalogue_produits c
  where exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'manager'));
$$;
revoke all on function public.catalogue_prix_achat() from public, anon;
grant execute on function public.catalogue_prix_achat() to authenticated;

-- Met un détail de consommables à l'échelle d'un facteur (arrondi à l'euro, écart reporté sur la dernière ligne).
create or replace function public.consommables_mis_a_echelle(p_detail jsonb, p_facteur numeric)
returns jsonb language sql immutable set search_path to 'public' as $$
  with l as (
    select x, ord, round((x->>'prix_ht')::numeric * p_facteur, 0) as prix, count(*) over () as nb
    from jsonb_array_elements(p_detail) with ordinality as t(x, ord)
  ), total as (
    select round(sum((x->>'prix_ht')::numeric * coalesce((x->>'quantite')::numeric, 1)) * p_facteur, 2) as cible,
           sum(prix * coalesce((x->>'quantite')::numeric, 1)) as obtenu from l
  )
  select coalesce(jsonb_agg(jsonb_set(l.x, '{prix_ht}', to_jsonb(
    case when l.ord = l.nb and coalesce((l.x->>'quantite')::numeric, 1) = 1 then l.prix + (total.cible - total.obtenu) else l.prix end)) order by l.ord), '[]'::jsonb)
  from l, total;
$$;

-- Calcule les prix conseillés / planchers d'une catégorie ; avec p_appliquer, remplace aussi le prix de vente
-- du catalogue et complète pose, dépose et consommables manquants. Réservé à l'administration.
create or replace function public.appliquer_regles_tarifaires(p_categorie text, p_appliquer boolean default false)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  r public.regles_tarifaires%rowtype;
  v_conso numeric;
  n integer;
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin') then
    raise exception 'Réservé à l’administration.';
  end if;
  select * into r from public.regles_tarifaires where categorie = p_categorie;
  if not found then raise exception 'Aucune règle pour la catégorie %', p_categorie; end if;
  select coalesce(sum((x->>'prix_ht')::numeric * coalesce((x->>'quantite')::numeric, 1)), 0) into v_conso
    from jsonb_array_elements(r.consommables) x;

  update public.catalogue_produits c set
    prix_conseille_ht = case when coalesce(c.prix_achat_ht, 0) > 0 then round(c.prix_achat_ht * r.coef_fourniture, 0) else c.prix_conseille_ht end,
    prix_plancher_ht = case when coalesce(c.prix_achat_ht, 0) > 0 then round(c.prix_achat_ht * (1 + r.marge_min_pct / 100), 2) else c.prix_plancher_ht end,
    prix_unitaire_ht = case when p_appliquer and coalesce(c.prix_achat_ht, 0) > 0 then round(c.prix_achat_ht * r.coef_fourniture, 0) else c.prix_unitaire_ht end,
    forfait_pose_ht = case when p_appliquer and coalesce(c.forfait_pose_ht, 0) = 0 and r.pose_defaut_ht > 0
                            and coalesce(c.caracteristiques->>'pose_separee', '') <> 'true'
                            and coalesce(c.caracteristiques->>'prix_inclut_pose', '') <> 'true' then r.pose_defaut_ht else c.forfait_pose_ht end,
    forfait_evacuation_ht = case when p_appliquer and coalesce(c.forfait_evacuation_ht, 0) = 0 and r.depose_defaut_ht > 0
                            and coalesce(c.caracteristiques->>'pose_separee', '') <> 'true' then r.depose_defaut_ht else c.forfait_evacuation_ht end,
    -- Consommables : si le produit a déjà un forfait, le détail type est ramené à ce montant (le total ne change pas).
    consommables_detail = case when p_appliquer and c.consommables_detail = '[]'::jsonb and v_conso > 0
                            and coalesce(c.caracteristiques->>'pose_separee', '') <> 'true' then
                              case when coalesce(c.forfait_consommables_ht, 0) > 0 then public.consommables_mis_a_echelle(r.consommables, c.forfait_consommables_ht / v_conso)
                                   else r.consommables end
                            else c.consommables_detail end,
    forfait_consommables_ht = case when p_appliquer and c.consommables_detail = '[]'::jsonb and v_conso > 0 and coalesce(c.forfait_consommables_ht, 0) = 0
                            and coalesce(c.caracteristiques->>'pose_separee', '') <> 'true' then v_conso else c.forfait_consommables_ht end
  where c.categorie = p_categorie and c.actif;
  get diagnostics n = row_count;
  update public.regles_tarifaires set updated_at = now() where categorie = p_categorie;
  return n;
end $$;
revoke all on function public.appliquer_regles_tarifaires(text, boolean) from public, anon;
grant execute on function public.appliquer_regles_tarifaires(text, boolean) to authenticated;

-- Premier calcul des prix conseillés et planchers (sans toucher aux prix de vente).
update public.catalogue_produits c set
  prix_conseille_ht = round(c.prix_achat_ht * r.coef_fourniture, 0),
  prix_plancher_ht = round(c.prix_achat_ht * (1 + r.marge_min_pct / 100), 2)
from public.regles_tarifaires r
where r.categorie = c.categorie and coalesce(c.prix_achat_ht, 0) > 0;

revoke all on function public.consommables_mis_a_echelle(jsonb, numeric) from public, anon;
grant execute on function public.consommables_mis_a_echelle(jsonb, numeric) to authenticated;
