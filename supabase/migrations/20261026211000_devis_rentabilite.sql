-- Rentabilité enregistrée avec le devis (alerte et tableau de bord manager).
alter table public.devis add column if not exists niveau_rentabilite text check (niveau_rentabilite in ('ok','sous_conseille','non_rentable'));
alter table public.devis add column if not exists plancher_ht numeric;
grant select (niveau_rentabilite, plancher_ht), insert (niveau_rentabilite, plancher_ht), update (niveau_rentabilite, plancher_ht) on public.devis to authenticated;
