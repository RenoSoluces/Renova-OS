-- Allow partner accounts to manage apporteurs within their own organisation.
-- RLS keeps both update and delete operations scoped to current_organisation_id().
drop policy if exists apporteurs_update_scope on public.apporteurs_affaires;
create policy apporteurs_update_scope on public.apporteurs_affaires
for update to authenticated
using (
  (is_super_admin() or organisation_id = current_organisation_id())
  and (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
    )
  )
)
with check (
  (is_super_admin() or organisation_id = current_organisation_id())
  and (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
    )
  )
);

drop policy if exists apporteurs_delete_scope on public.apporteurs_affaires;
create policy apporteurs_delete_scope on public.apporteurs_affaires
for delete to authenticated
using (
  (is_super_admin() or organisation_id = current_organisation_id())
  and exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
  )
);
