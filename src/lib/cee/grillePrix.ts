/**
 * CEE par délégataire : choix du prix applicable (€/MWh cumac) dans la grille d'un délégataire et calcul de la prime.
 * Aucun prix n'est fourni par défaut : ils proviennent des contrats saisis par l'entreprise.
 */
export type PrecariteCee = 'grande_precarite' | 'precarite' | 'classique'

export const LIBELLES_PRECARITE: Record<PrecariteCee, string> = {
  grande_precarite: 'Grande précarité',
  precarite: 'Précarité',
  classique: 'Classique',
}

export interface LignePrix {
  id: string
  delegataire_id: string
  fiche_reference: string | null
  precarite: PrecariteCee | null
  prix_eur_par_mwh_cumac: number
  bonification_pct: number
  date_debut: string | null
  date_fin: string | null
  actif: boolean
}

export interface CritereCee {
  delegataireId: string
  fiche?: string | null
  precarite?: PrecariteCee | null
  /** Jour du calcul, AAAA-MM-JJ (par défaut aujourd'hui). */
  date?: string
}

const normFiche = (f?: string | null) => String(f ?? '').replace(/[\s_-]+/g, '').toUpperCase()
const aujourdhui = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Catégorie MaPrimeRénov' enregistrée sur le prospect → précarité CEE. */
export function precariteDepuisCategorieMpr(categorie?: string | null): PrecariteCee | null {
  if (!categorie) return null
  if (categorie === 'TresModeste') return 'grande_precarite'
  if (categorie === 'Modeste') return 'precarite'
  return 'classique'
}

/**
 * Ligne la plus spécifique : une fiche précise l'emporte sur « toutes les fiches », une précarité précise sur
 * « tous les ménages ». À spécificité égale, la période qui a commencé le plus récemment l'emporte.
 */
export function ligneApplicable(grille: LignePrix[], c: CritereCee): LignePrix | null {
  const jour = c.date || aujourdhui()
  const fiche = normFiche(c.fiche)
  const candidates = grille.filter(l => {
    if (!l.actif || l.delegataire_id !== c.delegataireId) return false
    if (l.date_debut && l.date_debut > jour) return false
    if (l.date_fin && l.date_fin < jour) return false
    if (l.fiche_reference && normFiche(l.fiche_reference) !== fiche) return false
    if (l.precarite && l.precarite !== c.precarite) return false
    return true
  })
  if (candidates.length === 0) return null
  const score = (l: LignePrix) => (l.fiche_reference ? 2 : 0) + (l.precarite ? 1 : 0)
  return [...candidates].sort((a, b) => score(b) - score(a) || String(b.date_debut ?? '').localeCompare(String(a.date_debut ?? '')))[0]
}

/** Prix net par MWh cumac, bonification comprise. */
export const prixNet = (l: Pick<LignePrix, 'prix_eur_par_mwh_cumac' | 'bonification_pct'>): number =>
  Math.round(l.prix_eur_par_mwh_cumac * (1 + (Number(l.bonification_pct) || 0) / 100) * 10000) / 10000

/** Prime CEE estimée = MWh cumac × prix net, arrondie au centime. */
export function primeCee(mwhCumac: number, ligne: Pick<LignePrix, 'prix_eur_par_mwh_cumac' | 'bonification_pct'> | null): number {
  if (!ligne || !(mwhCumac > 0)) return 0
  return Math.round(mwhCumac * prixNet(ligne) * 100) / 100
}
