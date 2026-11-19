-- Separate personal commission invoices from customer invoices.
-- This table tracks the invoice submitted by a commercial for their own commission.
create table if not exists public.commission_factures (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions(id) on delete restrict,
  commercial_id uuid not null references public.profiles(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  numero_facture_emise text,
  montant_ht numeric(12,2) not null check (montant_ht >= 0),
  taux_tva numeric(5,2) not null default 0 check (taux_tva >= 0 and taux_tva <= 100),
  date_emission date,
  pdf_storage_path text,
  statut text not null default 'a_preparer'
    check (statut in ('a_preparer','deposee','validee','refusee','payee')),
  email_envoye_at timestamptz,
  email_erreur text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commission_id),
  constraint commission_factures_invoice_number_nonempty
    check (numero_facture_emise is null or length(trim(numero_facture_emise)) > 0),
  constraint commission_factures_submission_complete
    check (statut not in ('deposee','validee','payee') or
      (numero_facture_emise is not null and date_emission is not null and pdf_storage_path is not null))
);

create index if not exists commission_factures_owner_idx
  on public.commission_factures (commercial_id, statut, created_at desc);
create index if not exists commission_factures_org_idx
  on public.commission_factures (organisation_id, statut, created_at desc);

alter table public.commission_factures enable row level security;

drop policy if exists commission_factures_select_scope on public.commission_factures;
create policy commission_factures_select_scope
on public.commission_factures for select to authenticated
using (
  public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and (
      commercial_id = (select auth.uid())
      or exists (
        select 1 from public.profiles me
        where me.id = (select auth.uid())
          and me.role = any(array['admin','manager','partner_admin','company_admin']::text[])
          and me.organisation_id = commission_factures.organisation_id
      )
    )
  )
);

drop policy if exists commission_factures_insert_owner on public.commission_factures;
create policy commission_factures_insert_owner
on public.commission_factures for insert to authenticated
with check (
  commercial_id = (select auth.uid())
  and organisation_id = public.current_organisation_id()
  and statut = 'a_preparer'
  and exists (
    select 1 from public.commissions c
    where c.id = commission_factures.commission_id
      and c.commercial_id = (select auth.uid())
      and c.organisation_id = commission_factures.organisation_id
      and c.statut not in ('annulee')
      and c.montant_commercial = commission_factures.montant_ht
  )
);

drop policy if exists commission_factures_update_scope on public.commission_factures;
create policy commission_factures_update_scope
on public.commission_factures for update to authenticated
using (
  public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role = any(array['admin','manager','partner_admin','company_admin']::text[])
        and me.organisation_id = commission_factures.organisation_id
    )
  )
)
with check (
  public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role = any(array['admin','manager','partner_admin','company_admin']::text[])
        and me.organisation_id = commission_factures.organisation_id
    )
  )
);

drop policy if exists commission_factures_delete_admin on public.commission_factures;
create policy commission_factures_delete_admin
on public.commission_factures for delete to authenticated
using (
  public.is_super_admin()
  or (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role = any(array['admin','manager','partner_admin','company_admin']::text[])
        and me.organisation_id = commission_factures.organisation_id
    )
  )
);

create or replace function public.set_commission_factures_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists commission_factures_updated_at on public.commission_factures;
create trigger commission_factures_updated_at
before update on public.commission_factures
for each row execute function public.set_commission_factures_updated_at();
