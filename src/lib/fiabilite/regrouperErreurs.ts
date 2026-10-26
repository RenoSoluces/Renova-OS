export interface EntreeErreur {
  id: string
  description: string
  actor_id: string | null
  created_at: string
  meta: Record<string, string> | null
}
export interface GroupeErreur {
  cle: string
  message: string
  occurrences: number
  utilisateurs: string[]
  pages: string[]
  derniere: string
  exemple: EntreeErreur
}

/** Clé de regroupement : message sans identifiants ni nombres. */
export const cleErreur = (message: string) => message.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{8,}|\d+/gi, '#').trim().toLowerCase()

/** Regroupe les erreurs par cause, les plus fréquentes (puis les plus récentes) en premier. */
export function regrouperErreurs(entrees: EntreeErreur[]): GroupeErreur[] {
  const groupes = new Map<string, GroupeErreur>()
  for (const e of entrees) {
    const cle = cleErreur(e.description)
    let g = groupes.get(cle)
    if (!g) { g = { cle, message: e.description, occurrences: 0, utilisateurs: [], pages: [], derniere: e.created_at, exemple: e }; groupes.set(cle, g) }
    g.occurrences++
    if (e.actor_id && !g.utilisateurs.includes(e.actor_id)) g.utilisateurs.push(e.actor_id)
    const page = e.meta?.page
    if (page && !g.pages.includes(page)) g.pages.push(page)
    if (e.created_at > g.derniere) { g.derniere = e.created_at; g.exemple = e; g.message = e.description }
  }
  return [...groupes.values()].sort((a, b) => b.occurrences - a.occurrences || b.derniere.localeCompare(a.derniere))
}
