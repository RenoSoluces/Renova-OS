/*
# RENOVA OS — Stockage de fichiers & cycle de vie des dossiers

## 1. Bucket de stockage
Crée le bucket `documents` (public en lecture, écriture réservée aux
utilisateurs authentifiés) pour permettre l'upload réel de pièces
justificatives (devis signés, avis d'imposition, RIB, photos...).

## 2. Dossiers
- `dossiers.devis_id` : lien direct vers le devis à l'origine du dossier
- `documents.type` reste libre (texte) : on l'utilise pour catégoriser les
  pièces attendues (ex: 'devis_signe', 'avis_imposition', 'rib', 'photos')
- `documents.recu` (boolean) : une pièce peut être "attendue" (créée à la
  génération du dossier, recu=false) puis marquée reçue après upload réel
*/

-- ── 1. Bucket "documents" ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_bucket_read" ON storage.objects;
CREATE POLICY "documents_bucket_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_write" ON storage.objects;
CREATE POLICY "documents_bucket_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_update" ON storage.objects;
CREATE POLICY "documents_bucket_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- ── 2. Dossiers ↔ Devis + checklist de pièces ─────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dossiers' AND column_name='devis_id') THEN
    ALTER TABLE dossiers ADD COLUMN devis_id uuid REFERENCES devis(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='recu') THEN
    ALTER TABLE documents ADD COLUMN recu boolean NOT NULL DEFAULT false;
  END IF;
END $$;
