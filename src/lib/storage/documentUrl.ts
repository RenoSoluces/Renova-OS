import { supabase } from '../supabase'

const STORAGE_MARKERS = [
  '/storage/v1/object/public/documents/',
  '/storage/v1/object/sign/documents/',
  '/storage/v1/object/authenticated/documents/',
]

export function getDocumentStoragePath(value: string | null | undefined): string | null {
  if (!value) return null
  for (const marker of STORAGE_MARKERS) {
    const index = value.indexOf(marker)
    if (index >= 0) {
      const path = value.slice(index + marker.length).split('?')[0]
      try { return decodeURIComponent(path) } catch { return path }
    }
  }
  // New rows store the object path rather than a public URL.
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '')
  return null
}

export async function resolveDocumentUrl(value: string | null | undefined): Promise<string> {
  if (!value) return ''
  const path = getDocumentStoragePath(value)
  if (!path) return value
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) {
    console.error('[RENOVA OS] URL signée indisponible pour un document.')
    return ''
  }
  return data.signedUrl
}

export async function resolveDocumentRows<T extends { url?: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(async row => ({
    ...row,
    url: await resolveDocumentUrl(row.url),
  } as T)))
}

export async function removeDocumentStorageObject(value: string | null | undefined): Promise<void> {
  const path = getDocumentStoragePath(value)
  if (!path) return
  const { error } = await supabase.storage.from('documents').remove([path])
  if (error) console.error('[RENOVA OS] Suppression du fichier impossible.')
}
