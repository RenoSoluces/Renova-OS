export interface StatutSav {
  value: string
  label: string
  /** badge : classe de pastille du design system. */
  badge: 'badge-warning' | 'badge-info' | 'badge-neutral' | 'badge-success'
  ouvert: boolean
}

export const STATUTS_SAV: StatutSav[] = [
  { value: 'ouvert', label: 'À traiter', badge: 'badge-warning', ouvert: true },
  { value: 'en_cours', label: 'En cours', badge: 'badge-info', ouvert: true },
  { value: 'rdv_planifie', label: 'RDV planifié', badge: 'badge-info', ouvert: true },
  { value: 'attente_fournisseur', label: 'Attente fournisseur', badge: 'badge-neutral', ouvert: true },
  { value: 'clos', label: 'Réglé', badge: 'badge-success', ouvert: false },
]

export const statutSav = (value?: string | null): StatutSav =>
  STATUTS_SAV.find(s => s.value === value) ?? { value: value || '', label: value || '—', badge: 'badge-neutral', ouvert: true }

export interface SavMini { statut: string; date_cloture?: string | null; created_at?: string | null }

/** Compte les SAV par statut ; « réglés » ne compte que les clôtures des `jours` derniers jours. */
export function compterSav(savs: SavMini[], jours = 30, maintenant = Date.now()) {
  const limite = maintenant - jours * 86400000
  const nb = (v: string) => savs.filter(s => s.statut === v).length
  return {
    aTraiter: nb('ouvert'),
    enCours: nb('en_cours'),
    rdvPlanifies: nb('rdv_planifie'),
    attenteFournisseur: nb('attente_fournisseur'),
    regles: savs.filter(s => s.statut === 'clos' && new Date(s.date_cloture || s.created_at || 0).getTime() >= limite).length,
    ouverts: savs.filter(s => statutSav(s.statut).ouvert).length,
  }
}
