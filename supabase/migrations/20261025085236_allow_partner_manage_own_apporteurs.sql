-- Restrict apporteur creation/updates/deletes to network managers.
-- Every operation remains scoped to the current organisation (or super admin).
drop policy if exists apporteurs_insert_scope on public.apporteurs_affaires;
create policy apporteurs_insert_scope on public.apporteurs_affaires
for insert to authenticated
with check (
  (is_super_admin() or organisation_id = current_organisation_id())
  and created_by = auth.uid()
  and exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
  )
);

drop policy if exists apporteurs_update_scope on public.apporteurs_affaires;
create policy apporteurs_update_scope on public.apporteurs_affaires
for update to authenticated
using (
  (is_super_admin() or organisation_id = current_organisation_id())
  and exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
  )
)
with check (
  (is_super_admin() or organisation_id = current_organisation_id())
  and exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role = any(array['admin','manager','partner','partner_admin','company_admin']::text[])
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
