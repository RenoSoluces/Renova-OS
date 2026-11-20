-- Matrice de rémunération des apporteurs : copie de la grille de référence (profil de référence) pour chaque apporteur.
create or replace function public.fn_copier_matrice_apporteur(p_apporteur uuid)
returns integer language plpgsql security definer set search_path to 'public'
as $$
declare
  v_ref constant uuid := '288a684c-e306-46b4-9040-2e36e4ea462f';
  n integer := 0;
begin
  if p_apporteur is null or p_apporteur = v_ref then return 0; end if;
  if not exists (select 1 from public.profiles where id = p_apporteur and role = 'apporteur') then return 0; end if;
  if exists (select 1 from public.commission_bareme where commercial_id = p_apporteur) then return 0; end if;
  insert into public.commission_bareme (type, libelle, montant_commercial, montant_societe, pourcentage_commercial, actif, commercial_id,
      produit_id, mode, base_pourcentage, priorite, date_debut, date_fin, public_cible, categorie_produit, variante_produit,
      panneaux_min, panneaux_max, pourcentage_societe)
  select type, libelle, montant_commercial, montant_societe, pourcentage_commercial, actif, p_apporteur,
      produit_id, mode, base_pourcentage, priorite, date_debut, date_fin, public_cible, categorie_produit, variante_produit,
      panneaux_min, panneaux_max, pourcentage_societe
  from public.commission_bareme where commercial_id = v_ref and actif;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.fn_copier_matrice_apporteur(uuid) from public, anon, authenticated;
-- Le trigger trg_matrice_apporteur (sur profiles, rôle apporteur) appelle cette fonction ; voir la base pour sa définition exacte.
