-- Porte-à-porte : produit travaillé pendant la tournée et réponses au questionnaire de qualification.
alter table public.tournees add column if not exists produit text;
alter table public.tournee_portes add column if not exists produit text;
alter table public.tournee_portes add column if not exists reponses jsonb not null default '{}'::jsonb;
