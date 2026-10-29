import { lirePages } from './catalogue/chargerCatalogue'

type ErreurPage = { message: string; code?: string } | null

/**
 * Lit TOUTES les lignes d'une requête Supabase, par paquets de 1 000.
 *
 * Supabase (PostgREST) ne renvoie jamais plus de 1 000 lignes par requête, même avec `.limit(5000)` :
 * au-delà, les listes étaient coupées sans aucun message (ex. prospects, catalogue).
 * `requete` doit construire la requête complète (select, filtres, tris) sans `.limit()` ni `.range()`.
 * Un tri final sur `id` garantit un découpage stable entre les paquets.
 */
export function lireTout<T = any>(requete: () => any): Promise<{ data: T[]; error: ErreurPage }> {
  return lirePages<T>((debut, fin) => requete().order('id', { ascending: true }).range(debut, fin))
}
