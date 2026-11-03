export type TypeTexte = 'arrete' | 'decret' | 'projet' | 'information'
export type StatutVeille = 'a_relire' | 'publie' | 'archive'

export interface EntreeVeille {
  id: string
  titre: string
  resume: string | null
  dispositifs: string[]
  type_texte: TypeTexte
  fiches_concernees: string[]
  date_publication: string | null
  date_effet: string | null
  source_url: string | null
  source_note: string | null
  impact: string | null
  statut: StatutVeille
}

export const DISPOSITIFS = [
  { value: 'cee', label: 'CEE' },
  { value: 'mpr', label: 'MaPrimeRénov\'' },
  { value: 'anah', label: 'MonProjetAnah' },
  { value: 'autre', label: 'Autre' },
]
export const TYPES_TEXTE: { value: TypeTexte; label: string }[] = [
  { value: 'arrete', label: 'Arrêté' },
  { value: 'decret', label: 'Décret' },
  { value: 'projet', label: 'Projet de texte' },
  { value: 'information', label: 'Information' },
]

export type EtatTexte = 'projet' | 'a_venir' | 'en_vigueur' | 'sans_date'

export const jourIso = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Un projet n'est pas encore un texte applicable ; sinon tout dépend de la date d'effet. */
export function etatTexte(e: Pick<EntreeVeille, 'type_texte' | 'date_effet'>, jour: string = jourIso()): EtatTexte {
  if (e.type_texte === 'projet') return 'projet'
  if (!e.date_effet) return 'sans_date'
  return e.date_effet > jour ? 'a_venir' : 'en_vigueur'
}

export const LIBELLES_ETAT: Record<EtatTexte, string> = {
  projet: 'Projet',
  a_venir: 'À venir',
  en_vigueur: 'En vigueur',
  sans_date: 'Date d\'effet à confirmer',
}

/** Nombre de jours entre `jour` et la date d'effet (négatif si déjà en vigueur). */
export function joursAvantEffet(dateEffet: string | null, jour: string = jourIso()): number | null {
  if (!dateEffet) return null
  const a = Date.parse(`${jour}T12:00:00Z`)
  const b = Date.parse(`${dateEffet}T12:00:00Z`)
  return Math.round((b - a) / 86400000)
}

export const normaliserFiche = (f: string | null | undefined): string => String(f ?? '').replace(/[\s_-]+/g, '').toUpperCase()

export interface DossierVeille {
  id: string
  reference: string | null
  statut: string | null
  client: string
  fiches: string[]
}

const STATUTS_CLOS = new Set(['installe', 'refuse'])

/**
 * Dossiers en cours dont au moins une fiche d'opération est visée par l'entrée de veille.
 * Une entrée sans fiche précise (décret général…) ne désigne aucun dossier en particulier.
 */
export function dossiersConcernes(entree: Pick<EntreeVeille, 'fiches_concernees'>, dossiers: DossierVeille[]): DossierVeille[] {
  const visees = new Set(entree.fiches_concernees.map(normaliserFiche).filter(Boolean))
  if (visees.size === 0) return []
  return dossiers.filter(d => !STATUTS_CLOS.has((d.statut || '').toLowerCase()) && d.fiches.some(f => visees.has(normaliserFiche(f))))
}
