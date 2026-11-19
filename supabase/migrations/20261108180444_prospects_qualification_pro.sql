-- Questionnaire de qualification des prospects professionnels (réponses saisies pendant l'appel).
alter table public.prospects
  add column if not exists qualification_pro jsonb not null default '{}'::jsonb;
