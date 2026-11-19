ALTER TABLE documents ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES catalogue_produits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_produit_id ON documents(produit_id);
NOTIFY pgrst, 'reload schema';
