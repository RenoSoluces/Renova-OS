-- Cloisonnement par partenaire : un partenaire (organisation non interne) qui accède à un client par partage
-- ne voit que SES dossiers (partenaire_organisation_id = son organisation) et les devis, documents et SAV rattachés.
-- Le personnel interne et le propriétaire du prospect gardent la vue complète.

create or replace function public.est_acces_partage_seul(p_prospect_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select not public.is_super_admin()
    and coalesce((select o.type from public.organisations o where o.id = public.current_organisation_id()), 'interne') <> 'interne'
    and not exists (select 1 from public.prospects p where p.id = p_prospect_id and p.organisation_id = public.current_organisation_id());
$$;

create or replace function public.dossier_row_visible(p_prospect_id uuid, p_partenaire uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.prospect_visible(p_prospect_id)
    and (not public.est_acces_partage_seul(p_prospect_id) or p_partenaire = public.current_organisation_id());
$$;

create or replace function public.dossier_visible(p_dossier_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.dossiers d
      where d.id = p_dossier_id and public.dossier_row_visible(d.prospect_id, d.partenaire_organisation_id)
    );
$$;

create or replace function public.devis_row_visible(p_prospect_id uuid, p_dossier_id uuid, p_devis_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.prospect_visible(p_prospect_id)
    and (
      not public.est_acces_partage_seul(p_prospect_id)
      or exists (
        select 1 from public.dossiers d
        where d.partenaire_organisation_id = public.current_organisation_id()
          and (d.id = p_dossier_id or d.devis_id = p_devis_id)
      )
    );
$$;

grant execute on function public.est_acces_partage_seul(uuid), public.dossier_row_visible(uuid, uuid),
  public.devis_row_visible(uuid, uuid, uuid), public.dossier_visible(uuid) to authenticated;

drop policy if exists dossiers_select_scope on public.dossiers;
create policy dossiers_select_scope on public.dossiers for select using (public.dossier_row_visible(prospect_id, partenaire_organisation_id));
drop policy if exists dossiers_update_scope on public.dossiers;
create policy dossiers_update_scope on public.dossiers for update
  using (public.dossier_row_visible(prospect_id, partenaire_organisation_id))
  with check (public.dossier_row_visible(prospect_id, partenaire_organisation_id));

create or replace function public.fn_dossier_partenaire_auto()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.partenaire_organisation_id is null and auth.uid() is not null and public.est_acces_partage_seul(new.prospect_id) then
    new.partenaire_organisation_id := public.current_organisation_id();
  end if;
  return new;
end;
$$;
revoke all on function public.fn_dossier_partenaire_auto() from public, anon, authenticated;
drop trigger if exists dossiers_00_partenaire_auto on public.dossiers;
create trigger dossiers_00_partenaire_auto before insert on public.dossiers for each row execute function public.fn_dossier_partenaire_auto();

drop policy if exists sav_select_scope on public.sav_interventions;
create policy sav_select_scope on public.sav_interventions for select using (public.dossier_visible(dossier_id));
drop policy if exists sav_write_scope on public.sav_interventions;
create policy sav_write_scope on public.sav_interventions for all using (public.dossier_visible(dossier_id)) with check (public.dossier_visible(dossier_id));

do $d$
declare cond text := '(((dossier_id IS NOT NULL) AND public.dossier_visible(dossier_id)) OR ((dossier_id IS NULL) AND (prospect_id IS NOT NULL) AND public.prospect_visible(prospect_id)) OR ((prospect_id IS NULL) AND (dossier_id IS NULL) AND public.is_admin_ou_manager()))';
begin
  execute 'drop policy if exists documents_select_scope on public.documents';
  execute 'create policy documents_select_scope on public.documents for select using ' || cond;
  execute 'drop policy if exists documents_delete_scope on public.documents';
  execute 'create policy documents_delete_scope on public.documents for delete using ' || cond;
  execute 'drop policy if exists documents_insert_scope on public.documents';
  execute 'create policy documents_insert_scope on public.documents for insert with check ' || cond;
  execute 'drop policy if exists documents_update_scope on public.documents';
  execute 'create policy documents_update_scope on public.documents for update using ' || cond || ' with check ' || cond;
end $d$;

drop policy if exists devis_select_scope on public.devis;
create policy devis_select_scope on public.devis for select using (public.devis_row_visible(prospect_id, dossier_id, id));
drop policy if exists devis_update_scope on public.devis;
create policy devis_update_scope on public.devis for update
  using (public.devis_row_visible(prospect_id, dossier_id, id)) with check (public.prospect_visible(prospect_id));
drop policy if exists devis_delete_scope on public.devis;
create policy devis_delete_scope on public.devis for delete using (public.devis_row_visible(prospect_id, dossier_id, id));

create or replace function public.fn_devis_partenaire_auto()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_dossier uuid;
begin
  if new.dossier_id is null and auth.uid() is not null and public.est_acces_partage_seul(new.prospect_id) then
    select d.id into v_dossier from public.dossiers d
      where d.prospect_id = new.prospect_id and d.partenaire_organisation_id = public.current_organisation_id()
      order by d.created_at limit 1;
    if v_dossier is null then
      insert into public.dossiers (prospect_id, statut, partenaire_organisation_id)
      values (new.prospect_id, 'creation', public.current_organisation_id()) returning id into v_dossier;
    end if;
    new.dossier_id := v_dossier;
  end if;
  return new;
end;
$$;
revoke all on function public.fn_devis_partenaire_auto() from public, anon, authenticated;
drop trigger if exists devis_00_partenaire_auto on public.devis;
create trigger devis_00_partenaire_auto before insert on public.devis for each row execute function public.fn_devis_partenaire_auto();
