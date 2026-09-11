/*
# Prospects professionnels

Prépare le terrain pour la gestion des prospects "personne morale" (entreprises,
copropriétés, bailleurs sociaux...) en plus des particuliers, en vue d'y rattacher
ultérieurement les fiches CEE dédiées au secteur professionnel/tertiaire
(cf. `dispositifs_aides.secteur = 'tertiaire'` / `public_cible = 'professionnel'`).

On ne duplique pas la table : `nom`/`prenom`/`email`/`telephone`/`adresse`... restent
les coordonnées du contact au sein de l'entreprise, et les colonnes ci-dessous
complètent l'identité de la personne morale quand `type_prospect = 'professionnel'`.
*/

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS type_prospect text NOT NULL DEFAULT 'particulier', -- 'particulier' | 'professionnel'
  ADD COLUMN IF NOT EXISTS raison_sociale text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS forme_juridique text;

CREATE INDEX IF NOT EXISTS idx_prospects_type_prospect ON prospects(type_prospect);
