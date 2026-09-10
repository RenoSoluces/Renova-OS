import { supabase } from '../supabase'
import type { Document } from '../../types'

export async function uploadDocument(
  file: File,
  opts: { dossierId?: string | null; type?: string; nouvelleVersionDe?: Document } = {}
) {
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${opts.dossierId || 'divers'}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) return { error: uploadError.message, document: null }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)

  const versionPrecedente = opts.nouvelleVersionDe
  const { data, error } = await supabase
    .from('documents')
    .insert({
      dossier_id: versionPrecedente?.dossier_id ?? opts.dossierId ?? null,
      nom: file.name,
      type: opts.type || (ext.toLowerCase()),
      taille: file.size,
      url: urlData.publicUrl,
      recu: true,
      groupe_id: versionPrecedente?.groupe_id, // absent => la colonne prend gen_random_uuid() par défaut (nouveau document)
      version: versionPrecedente ? versionPrecedente.version + 1 : 1,
    })
    .select()
    .single()

  if (error) return { error: error.message, document: null }
  return { error: null, document: data }
}
