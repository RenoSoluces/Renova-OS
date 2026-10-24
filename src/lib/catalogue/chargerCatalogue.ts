import { supabase } from '../supabase'

/**
 * Lecture complète de `catalogue_produits`, page par page.
 *
 * Supabase (PostgREST) plafonne chaque requête à 1 000 lignes par défaut. Le catalogue dépasse
 * désormais ce seuil : sans pagination, la fin de la liste triée (ex. SSC, VMC, visites techniques
 * quand on trie par catégorie) disparaissait silencieusement des écrans.
 * On avance du nombre de lignes réellement reçues, donc cela fonctionne quel que soit le plafond configuré.
 */
type Tri = { colonne: string; ascending?: boolean }

interface Options {
  /** Colonnes à lire (par défaut toutes). */
  colonnes?: string
  /** Ne garder que les produits actifs. */
  actifSeulement?: boolean
  /** Exclure un nom exact (ex. le produit générique « Isolation »). */
  exclureNom?: string
  /** Ne garder que ces catégories. */
  categories?: string[]
  /** Tris successifs. `id` est toujours ajouté en dernier pour une pagination stable. */
  tri?: Tri[]
}

type ErreurPage = { message: string; code?: string } | null
type LecturePage<T> = (debut: number, fin: number) => PromiseLike<{ data: T[] | null; error: ErreurPage }>

const MAX_PAGES = 50
const TAILLE_PAGE = 1000

/** PostgREST répond « 416 Requested range not satisfiable » (PGRST103) quand on demande au-delà de la dernière ligne. */
function estFinDePlage(error: ErreurPage): boolean {
  return !!error && (error.code === 'PGRST103' || /requested range not satisfiable/i.test(error.message || ''))
}

/**
 * Enchaîne les pages jusqu'à la fin. Une plage hors limites, ou une page vide, signifie « fin des données »
 * et n'est jamais une erreur. Toute autre erreur est renvoyée avec les lignes déjà lues.
 */
export async function lirePages<T>(lirePage: LecturePage<T>): Promise<{ data: T[]; error: ErreurPage }> {
  const lignes: T[] = []
  let debut = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await lirePage(debut, debut + TAILLE_PAGE - 1)
    if (estFinDePlage(error)) break
    if (error) return { data: lignes, error }
    if (!data || data.length === 0) break
    lignes.push(...data)
    debut += data.length
  }

  return { data: lignes, error: null }
}

export function chargerCatalogue<T = any>(options: Options = {}): Promise<{ data: T[]; error: ErreurPage }> {
  const { colonnes = '*', actifSeulement = false, exclureNom, categories, tri = [] } = options

  return lirePages<T>((debut, fin) => {
    let requete = supabase.from('catalogue_produits').select(colonnes)
    if (actifSeulement) requete = requete.eq('actif', true)
    if (exclureNom) requete = requete.neq('nom', exclureNom)
    if (categories?.length) requete = requete.in('categorie', categories)
    for (const t of tri) requete = requete.order(t.colonne, { ascending: t.ascending !== false })
    requete = requete.order('id', { ascending: true })
    return requete.range(debut, fin) as unknown as PromiseLike<{ data: T[] | null; error: ErreurPage }>
  })
}
