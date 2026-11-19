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
revoke all on function public.consommables_mis_a_echelle(jsonb, numeric) from public, anon;
grant execute on function public.consommables_mis_a_echelle(jsonb, numeric) to authenticated;
select public.consommables_mis_a_echelle('[{"libelle":"a","quantite":1,"prix_ht":180},{"libelle":"b","quantite":1,"prix_ht":120},{"libelle":"c","quantite":1,"prix_ht":150},{"libelle":"d","quantite":1,"prix_ht":150},{"libelle":"e","quantite":1,"prix_ht":200}]', 650/800.0);
