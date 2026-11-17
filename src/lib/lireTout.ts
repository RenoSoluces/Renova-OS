type ErreurPage = { message: string; code?: string } | null

const TAILLE_PAGE = 1000
const MAX_PAGES = 50
/** Nombre de pages demandées en même temps (au lieu de les enchaîner une à une). */
const PARALLELE = 3

function estFinDePlage(error: ErreurPage): boolean {
  return !!error && (error.code === 'PGRST103' || /requested range not satisfiable/i.test(error.message || ''))
}

/**
 * Lit TOUTES les lignes d'une requête Supabase, par paquets de 1 000.
 *
 * Supabase (PostgREST) ne renvoie jamais plus de 1 000 lignes par requête, même avec `.limit(5000)` :
 * au-delà, les listes étaient coupées sans aucun message (ex. prospects, catalogue).
 * `requete` doit construire la requête complète (select, filtres, tris) sans `.limit()` ni `.range()`.
 * Un tri final sur `id` garantit un découpage stable entre les paquets.
 *
 * La première page part seule ; si elle est pleine, les suivantes sont demandées par lots de 3 en parallèle
 * (une base de ~2 700 lignes charge ainsi en 2 temps au lieu de 4).
 */
export async function lireTout<T = any>(requete: () => any): Promise<{ data: T[]; error: ErreurPage }> {
  const lire = (debut: number) => requete().order('id', { ascending: true }).range(debut, debut + TAILLE_PAGE - 1) as PromiseLike<{ data: T[] | null; error: ErreurPage }>
  const lignes: T[] = []
  let page = 0
  let fini = false

  while (!fini && page < MAX_PAGES) {
    const lot = page === 0 ? 1 : Math.min(PARALLELE, MAX_PAGES - page)
    const reponses = await Promise.all(Array.from({ length: lot }, (_, i) => lire((page + i) * TAILLE_PAGE)))
    for (const { data, error } of reponses) {
      if (estFinDePlage(error)) { fini = true; break }
      if (error) return { data: lignes, error }
      if (!data || data.length === 0) { fini = true; break }
      lignes.push(...data)
      if (data.length < TAILLE_PAGE) { fini = true; break }
    }
    page += lot
  }

  return { data: lignes, error: null }
}
