import { supabase } from '../supabase'
import type { Document } from '../../types'

export async function uploadDocument(
  file: File,
  opts: { dossierId?: string | null; prospectId?: string | null; type?: string; categorie?: string; partenaireId?: string | null; produitId?: string | null; nouvelleVersionDe?: Document } = {}
) {
  const ext = file.name.split('.').pop() || 'bin'
  const versionPrecedente = opts.nouvelleVersionDe
  const dossierId = opts.dossierId || versionPrecedente?.dossier_id || null
  const prospectId = opts.prospectId || versionPrecedente?.prospect_id || null
  const path = `${dossierId || prospectId || 'divers'}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) return { error: uploadError.message, document: null, path: null }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      dossier_id: dossierId,
      prospect_id: prospectId,
      categorie: opts.categorie || 'Général',
      partenaire_id: opts.partenaireId ?? null,
      produit_id: opts.produitId ?? versionPrecedente?.produit_id ?? null,
      nom: file.name,
      type: opts.type || (ext.toLowerCase()),
      taille: file.size,
      url: path,
      recu: true,
      groupe_id: versionPrecedente?.groupe_id, // absent => la colonne prend gen_random_uuid() par défaut (nouveau document)
      version: versionPrecedente ? versionPrecedente.version + 1 : 1,
    })
    .select()
    .single()

  if (error) return { error: error.message, document: null, path }
  return { error: null, document: data, path }
}
