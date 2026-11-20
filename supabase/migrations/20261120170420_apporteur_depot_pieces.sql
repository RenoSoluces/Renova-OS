-- Les apporteurs d'affaires peuvent DÉPOSER des pièces client (avis d'impôts, taxe foncière, pièce d'identité,
-- facture d'énergie) sur les prospects qu'ils ont apportés, et ne voient / ne suppriment que ce qu'ils ont
-- eux-mêmes déposé. Aucun accès aux autres documents, ni aux accès MPR. Fiche figée une fois un devis signé.

alter table public.documents add column if not exists depose_par uuid default auth.uid();

create or replace function public.apporteur_peut_deposer(p_prospect_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.prospects p
    where p.id = p_prospect_id
      and p.apporteur_user_id = (select auth.uid())
      and not exists (select 1 from public.devis d where d.prospect_id = p.id and d.statut = 'signe')
  );
$$;

create or replace function public.apporteur_objet_ok(object_name text, p_ecriture boolean)
returns boolean
language plpgsql stable security definer set search_path to 'public', 'storage'
as $$
declare f text;
begin
  f := (storage.foldername(object_name))[1];
  if f is null or f !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  if p_ecriture then
    return public.apporteur_peut_deposer(f::uuid);
  end if;
  return exists (select 1 from public.prospects p where p.id = f::uuid and p.apporteur_user_id = (select auth.uid()));
end;
$$;

drop policy if exists documents_insert_apporteur on public.documents;
create policy documents_insert_apporteur on public.documents for insert to authenticated
  with check (prospect_id is not null and dossier_id is null and depose_par = (select auth.uid())
    and categorie like 'Pièce client%' and public.apporteur_peut_deposer(prospect_id));

drop policy if exists documents_select_apporteur on public.documents;
create policy documents_select_apporteur on public.documents for select to authenticated
  using (depose_par = (select auth.uid()) and prospect_id is not null
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.apporteur_user_id = (select auth.uid())));

drop policy if exists documents_delete_apporteur on public.documents;
create policy documents_delete_apporteur on public.documents for delete to authenticated
  using (depose_par = (select auth.uid()) and prospect_id is not null and public.apporteur_peut_deposer(prospect_id));

drop policy if exists documents_bucket_insert_apporteur on storage.objects;
create policy documents_bucket_insert_apporteur on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.apporteur_objet_ok(name, true));

drop policy if exists documents_bucket_select_apporteur on storage.objects;
create policy documents_bucket_select_apporteur on storage.objects for select to authenticated
  using (bucket_id = 'documents' and owner_id = (select auth.uid())::text and public.apporteur_objet_ok(name, false));

drop policy if exists documents_bucket_delete_apporteur on storage.objects;
create policy documents_bucket_delete_apporteur on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and owner_id = (select auth.uid())::text and public.apporteur_objet_ok(name, true));
