-- Colonnes présentes dans des migrations du dépôt mais absentes de la base : l'enregistrement d'un devis
-- (conformite_devis) et la facturation interne (origine_interne) échouaient.
alter table public.devis add column if not exists conformite_devis jsonb not null default '{}'::jsonb;
alter table public.devis add column if not exists origine_interne boolean not null default false;
alter table public.dossier_facturation add column if not exists conditions_paiement text default '';
alter table public.dossier_facturation add column if not exists categorie_operation text default 'prestation de services';
drop trigger if exists trg_sync_commission_devis_signe on public.devis;
create trigger trg_sync_commission_devis_signe
after insert or update of statut on public.devis
for each row when (new.origine_interne is distinct from true)
execute function fn_sync_commission_devis_signe();
notify pgrst, 'reload schema';
