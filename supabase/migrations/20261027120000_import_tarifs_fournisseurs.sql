-- Import de tarifs fournisseurs : mise à jour groupée des prix d'achat, puis recalcul des prix
-- conseillés et planchers selon la règle de la catégorie (et, sur demande, du prix de vente).
create or replace function public.maj_prix_achat(p_lignes jsonb, p_appliquer_vente boolean default false)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin') then
    raise exception 'Réservé à l’administration.';
  end if;
  with l as (
    select (x->>'id')::uuid id, round((x->>'prix_achat_ht')::numeric, 2) achat
      from jsonb_array_elements(p_lignes) x
     where coalesce((x->>'prix_achat_ht')::numeric, 0) > 0
  ), cible as (
    select l.id, l.achat, r.coef_fourniture coef, r.marge_min_pct marge
      from l join public.catalogue_produits c on c.id = l.id
      left join public.regles_tarifaires r on r.categorie = c.categorie
  )
  update public.catalogue_produits c set
    prix_achat_ht = t.achat,
    prix_conseille_ht = case when t.coef is not null then round(t.achat * t.coef, 0) else c.prix_conseille_ht end,
    prix_plancher_ht = case when t.marge is not null then round(t.achat * (1 + t.marge / 100), 2) else c.prix_plancher_ht end,
    prix_unitaire_ht = case when p_appliquer_vente and t.coef is not null then round(t.achat * t.coef, 0) else c.prix_unitaire_ht end,
    caracteristiques = coalesce(c.caracteristiques, '{}'::jsonb) || jsonb_build_object('prix_achat_maj_le', to_char(now(), 'YYYY-MM-DD'))
  from cible t
  where c.id = t.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.maj_prix_achat(jsonb, boolean) from public, anon;
grant execute on function public.maj_prix_achat(jsonb, boolean) to authenticated;
