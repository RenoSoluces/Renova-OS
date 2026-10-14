-- Fiches techniques par produit, avec séparation des usages et correction d'adresse Idehome.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES catalogue_produits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_produit_id ON documents(produit_id);
UPDATE installateurs
SET adresse = '8 Rue Mermoz',
    code_postal = '34430',
    ville = 'Saint-Jean-de-Védas'
WHERE lower(nom) LIKE '%idehome%';
