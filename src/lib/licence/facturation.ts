/** Calcul des factures de licence (offre mensuelle ou annuelle avec remise). */
export interface LicenceTarif { nb_licences: number; prix_ht_mensuel: number; formule: 'mensuel' | 'annuel'; remise_annuelle_pct: number }
export const TVA_LICENCE = 20

const arrondi = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function montantAnnuelHt(l: LicenceTarif) { return arrondi(l.nb_licences * l.prix_ht_mensuel * 12 * (1 - l.remise_annuelle_pct / 100)) }
export function montantPeriodeHt(l: LicenceTarif) { return l.formule === 'annuel' ? montantAnnuelHt(l) : arrondi(l.nb_licences * l.prix_ht_mensuel) }
/** Économie annuelle de l'offre annuelle par rapport à 12 mensualités. */
export function economieAnnuelle(l: LicenceTarif) { return arrondi(l.nb_licences * l.prix_ht_mensuel * 12 - montantAnnuelHt(l)) }

/** Prochaine période facturable : démarre le lendemain de la fin de la dernière facture, sinon à `debut`, sinon aujourd'hui. */
export function prochainePeriode(l: LicenceTarif, derniereFin: string | null, debut: string | null, aujourdhui = new Date()) {
  const base = derniereFin ? new Date(`${derniereFin}T12:00:00`) : debut ? new Date(`${debut}T12:00:00`) : new Date(aujourdhui)
  const d0 = new Date(base)
  if (derniereFin) d0.setDate(d0.getDate() + 1)
  const fin = new Date(d0)
  if (l.formule === 'annuel') fin.setFullYear(fin.getFullYear() + 1); else fin.setMonth(fin.getMonth() + 1)
  fin.setDate(fin.getDate() - 1)
  return { debut: iso(d0), fin: iso(fin) }
}

export function calculerFacture(l: LicenceTarif, derniereFin: string | null, debut: string | null, aujourdhui = new Date()) {
  const ht = montantPeriodeHt(l)
  return { ...prochainePeriode(l, derniereFin, debut, aujourdhui), montant_ht: ht, tva_taux: TVA_LICENCE, montant_ttc: arrondi(ht * (1 + TVA_LICENCE / 100)) }
}

export const numeroFacture = (annee: number, rang: number) => `LIC-${annee}-${String(rang).padStart(4, '0')}`
