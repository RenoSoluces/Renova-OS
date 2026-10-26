import { supabase } from '../supabase'

let orgCache: { uid: string; org: string | null } | null = null

/** Organisation de l'utilisateur connecté (mise en cache par session). */
export async function organisationCourante(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return null
  if (orgCache?.uid === uid) return orgCache.org
  const { data: p } = await supabase.from('profiles').select('organisation_id').eq('id', uid).maybeSingle()
  orgCache = { uid, org: (p?.organisation_id as string | null) ?? null }
  return orgCache.org
}

/**
 * Fiche « entreprise » (Paramètres) de l'organisation de l'utilisateur connecté.
 * Ne jamais lire la table sans ce filtre : la direction générale voit toutes les entreprises,
 * et un document ne doit porter que l'identité de l'entreprise qui l'émet.
 */
export async function entrepriseCourante<T = any>(colonnes = '*'): Promise<{ data: T | null; error: { message: string } | null }> {
  const org = await organisationCourante()
  if (!org) return { data: null, error: null }
  const { data, error } = await supabase.from('entreprises').select(colonnes).eq('organisation_id', org).order('created_at', { ascending: true }).limit(1).maybeSingle()
  return { data: (data as T | null) ?? null, error: error ? { message: error.message } : null }
}
