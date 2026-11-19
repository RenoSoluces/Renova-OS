create or replace function public.enregistrer_pdf_facture_commission(p_facture_id uuid, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  f public.commission_factures%rowtype;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.role = 'apporteur') then
    raise exception 'Réservé aux apporteurs d’affaires';
  end if;
  select * into f from public.commission_factures
    where id = p_facture_id and commercial_id = uid for update;
  if not found then raise exception 'Facture introuvable ou accès refusé'; end if;
  if f.statut not in ('a_preparer','refusee') then raise exception 'Cette facture n’est plus modifiable'; end if;
  if f.numero_facture_emise is null or f.numero_facture_emise = '' then raise exception 'Numéro de facture manquant'; end if;
  if p_storage_path <> uid::text || '/' || f.id::text || '/' || f.numero_facture_emise || '.pdf' then
    raise exception 'Chemin de PDF invalide';
  end if;
  update public.commission_factures
    set pdf_storage_path = p_storage_path, updated_at = now()
    where id = f.id;
end;
$$;

revoke all on function public.enregistrer_pdf_facture_commission(uuid,text) from public, anon;
grant execute on function public.enregistrer_pdf_facture_commission(uuid,text) to authenticated;
