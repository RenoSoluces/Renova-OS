-- Commercials and apporteurs must not be able to read company commission payment schedules.
-- The commissions RLS policy still scopes the parent commission to the current user's access.
drop policy if exists commission_echeances_select_scope on public.commission_echeances;
create policy commission_echeances_select_scope
on public.commission_echeances
for select to authenticated
using (
  exists (
    select 1
    from public.commissions c
    where c.id = commission_echeances.commission_id
      and (
        public.is_admin_ou_manager()
        or commission_echeances.beneficiaire = 'commercial'
      )
  )
);
