/**
 * Rentabilité d'un devis : compare le total HT après remise au prix plancher et au prix conseillé.
 *
 * - Lignes de produits (liées au catalogue) : plancher = prix plancher du produit (prix d'achat + marge
 *   minimale de sa catégorie), conseillé = prix de vente conseillé.
 * - Lignes de prestation (pose, dépose, consommables, lignes libres) : comptées à leur montant, la remise
 *   ne devant pas « manger » la main-d'œuvre.
 * Sans plancher connu pour un produit, sa ligne est comptée à son montant (aucune marge disponible).
 */
export interface LigneRentabilite {
  produit_id?: string | null
  quantite: number
  prix_unitaire_ht: number
  designation?: string
}

export interface PrixProduit {
  prix_plancher_ht?: number | null
  prix_conseille_ht?: number | null
}

export type NiveauRentabilite = 'ok' | 'sous_conseille' | 'non_rentable'

export interface Rentabilite {
  niveau: NiveauRentabilite
  /** Total HT après remise. */
  montantHT: number
  plancherHT: number
  conseilleHT: number
  /** Remise supplémentaire encore possible avant de passer sous le plancher (0 si déjà dessous). */
  remiseMaxRestanteHT: number
  /** Manque à gagner par rapport au plancher (0 si rentable). */
  ecartPlancherHT: number
  /** Lignes de produits dont le prix unitaire est sous le plancher. */
  lignesSousPlancher: { designation: string; prix: number; plancher: number }[]
  /** Vrai si au moins un produit a un plancher connu (sinon l'analyse n'a pas de sens). */
  analysable: boolean
}

const arrondi = (n: number) => Math.round(n * 100) / 100

export function analyserRentabilite(
  lignes: LigneRentabilite[],
  produits: Map<string, PrixProduit> | Record<string, PrixProduit>,
  montantHTApresRemise: number,
): Rentabilite {
  const lire = (id: string) => (produits instanceof Map ? produits.get(id) : produits[id])
  let plancher = 0
  let conseille = 0
  let analysable = false
  const lignesSousPlancher: Rentabilite['lignesSousPlancher'] = []

  for (const l of lignes) {
    const qte = Math.max(0, Number(l.quantite) || 0)
    const montant = qte * (Number(l.prix_unitaire_ht) || 0)
    const p = l.produit_id ? lire(l.produit_id) : undefined
    const pl = Number(p?.prix_plancher_ht) || 0
    const co = Number(p?.prix_conseille_ht) || 0
    if (p && pl > 0) {
      analysable = true
      plancher += pl * qte
      conseille += (co > 0 ? co : Number(l.prix_unitaire_ht) || 0) * qte
      if ((Number(l.prix_unitaire_ht) || 0) < pl - 0.005) {
        lignesSousPlancher.push({ designation: l.designation || 'Produit', prix: Number(l.prix_unitaire_ht) || 0, plancher: pl })
      }
    } else {
      plancher += montant
      conseille += montant
    }
  }

  plancher = arrondi(plancher)
  conseille = arrondi(conseille)
  const ht = arrondi(montantHTApresRemise)
  const ecart = arrondi(Math.max(0, plancher - ht))
  const niveau: NiveauRentabilite = !analysable ? 'ok'
    : ht < plancher - 0.005 ? 'non_rentable'
      : ht < conseille - 0.005 ? 'sous_conseille' : 'ok'

  return {
    niveau, montantHT: ht, plancherHT: plancher, conseilleHT: conseille,
    remiseMaxRestanteHT: arrondi(Math.max(0, ht - plancher)), ecartPlancherHT: ecart,
    lignesSousPlancher, analysable,
  }
}

export interface Consommable { libelle: string; quantite?: number; unite?: string; prix_ht: number }

export const totalConsommables = (detail: Consommable[] | null | undefined) =>
  arrondi((detail || []).reduce((s, c) => s + (Number(c.prix_ht) || 0) * (Number(c.quantite ?? 1) || 0), 0))

/** Texte de détail des consommables pour la ligne du devis. */
export function descriptionConsommables(detail: Consommable[] | null | undefined): string {
  const lignes = (detail || []).filter(c => c.libelle?.trim())
  if (!lignes.length) return 'Consommables nécessaires à la fourniture et à la pose du produit.'
  return 'Comprend : ' + lignes.map(c => {
    const q = Number(c.quantite ?? 1)
    return `${c.libelle.trim()}${q && q !== 1 ? ` (${q}${c.unite && c.unite !== 'forfait' ? ` ${c.unite}` : ''})` : ''}`
  }).join(' ; ') + '.'
}
