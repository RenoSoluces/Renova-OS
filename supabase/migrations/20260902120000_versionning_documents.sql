-- Versionning des documents : plusieurs fichiers physiques peuvent représenter des
-- versions successives d'un même document logique (ex : devis corrigé, contrat signé
-- remplaçant un brouillon...). `groupe_id` regroupe toutes les versions d'un même document
-- (identique à `id` pour un document jamais reversionné) ; `version` incrémente à chaque
-- nouvel import remplaçant une version précédente.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS groupe_id uuid,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Chaque document existant devient sa propre v1 (groupe_id = son propre id) s'il n'a pas
-- déjà été rattaché à un groupe.
UPDATE documents SET groupe_id = id WHERE groupe_id IS NULL;

ALTER TABLE documents ALTER COLUMN groupe_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN groupe_id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_documents_groupe_id ON documents(groupe_id);
