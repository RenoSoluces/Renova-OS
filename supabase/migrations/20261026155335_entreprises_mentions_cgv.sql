-- Déjà appliqué sur Supabase le 26/10/2026.
alter table public.entreprises add column if not exists mediateur_nom text not null default '';
alter table public.entreprises add column if not exists mediateur_site text not null default '';
alter table public.entreprises add column if not exists assureur_decennale text not null default '';
alter table public.entreprises add column if not exists police_decennale text not null default '';
alter table public.entreprises add column if not exists couverture_decennale text not null default '';
