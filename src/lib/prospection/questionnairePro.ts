/**
 * Questionnaire de qualification d'un prospect professionnel, rempli pendant l'appel.
 * Chaque réponse porte un poids : la somme donne la température (chaud / tiède / froid).
 * Une réponse « bloquante » signale un produit ou un prospect non adapté.
 * Les produits à proposer sont déduits des réponses (déstratificateur, toiture plate, PAC, etc.).
 */
export interface OptionPro { valeur: string; label: string; poids?: number; bloquant?: string }
export interface QuestionPro { id: string; label: string; aide?: string; options: OptionPro[] }

export type ReponsesPro = Record<string, string>
export type TemperaturePro = 'chaud' | 'tiede' | 'froid'

export const QUESTIONS_PRO: QuestionPro[] = [
  { id: 'decideur', label: 'Interlocuteur', options: [
    { valeur: 'dirigeant', label: 'Dirigeant / décideur', poids: 3 },
    { valeur: 'technique', label: 'Responsable technique', poids: 2 },
    { valeur: 'autre', label: 'Autre personne', poids: 0 },
  ] },
  { id: 'site', label: 'Type de site', options: [
    { valeur: 'atelier', label: 'Atelier / production', poids: 2 },
    { valeur: 'entrepot', label: 'Entrepôt / logistique', poids: 2 },
    { valeur: 'agricole', label: 'Exploitation agricole', poids: 2 },
    { valeur: 'commerce', label: 'Magasin / commerce', poids: 1 },
    { valeur: 'bureau', label: 'Bureaux', poids: 1 },
    { valeur: 'hotel_resto', label: 'Hôtel / restaurant', poids: 1 },
    { valeur: 'autre', label: 'Autre' },
  ] },
  { id: 'occupation', label: 'Propriétaire du bâtiment ?', options: [
    { valeur: 'proprietaire', label: 'Propriétaire', poids: 2 },
    { valeur: 'locataire', label: 'Locataire', poids: -1, bloquant: 'Locataire : le propriétaire doit valider les travaux' },
  ] },
  { id: 'surface', label: 'Surface à chauffer / équiper', options: [
    { valeur: 'moins_300', label: '< 300 m²' },
    { valeur: '300_1000', label: '300 – 1 000 m²', poids: 1 },
    { valeur: 'plus_1000', label: '> 1 000 m²', poids: 2 },
  ] },
  { id: 'chauffage', label: 'Chauffage actuel', options: [
    { valeur: 'gaz', label: 'Gaz', poids: 2 },
    { valeur: 'fioul', label: 'Fioul', poids: 3 },
    { valeur: 'electrique', label: 'Électrique', poids: 2 },
    { valeur: 'pac', label: 'Pompe à chaleur', poids: 0 },
    { valeur: 'aucun', label: 'Pas de chauffage', poids: -1 },
  ] },
  { id: 'hauteur', label: 'Grand volume (plafond haut, halle) ?', aide: '6 m de hauteur ou plus : déstratificateur.', options: [
    { valeur: 'oui', label: 'Oui', poids: 2 },
    { valeur: 'non', label: 'Non' },
  ] },
  { id: 'toiture', label: 'Toiture', aide: 'Isolation de toiture plate uniquement : pas de bac acier ni de panneau sandwich.', options: [
    { valeur: 'plate', label: 'Plate (toiture-terrasse)', poids: 2 },
    { valeur: 'inclinee', label: 'Inclinée (tuiles, fibrociment…)', poids: 0 },
    { valeur: 'bac_acier', label: 'Bac acier / panneau sandwich', bloquant: 'Bac acier ou panneau sandwich : pas d’isolation de toiture' },
    { valeur: 'nsp', label: 'Ne sait pas' },
  ] },
  { id: 'chaud_froid', label: 'Bassin, process ou besoin chaud / froid ?', options: [
    { valeur: 'bassin', label: 'Bassin / plan d’eau', poids: 2 },
    { valeur: 'froid', label: 'Groupe froid (alimentaire)', poids: 2 },
    { valeur: 'process', label: 'Process industriel', poids: 2 },
    { valeur: 'non', label: 'Non' },
  ] },
  { id: 'facture', label: 'Facture d’énergie annuelle', options: [
    { valeur: 'moins_5k', label: '< 5 000 €' },
    { valeur: '5k_20k', label: '5 000 – 20 000 €', poids: 1 },
    { valeur: 'plus_20k', label: '> 20 000 €', poids: 3 },
    { valeur: 'nsp', label: 'Ne sait pas' },
  ] },
  { id: 'pv', label: 'Photovoltaïque déjà étudié ?', options: [
    { valeur: 'jamais', label: 'Jamais', poids: 1 },
    { valeur: 'etudie', label: 'Étudié, pas réalisé', poids: 1 },
    { valeur: 'equipe', label: 'Déjà équipé', bloquant: 'Déjà équipé en photovoltaïque' },
  ] },
  { id: 'delai', label: 'Projet', options: [
    { valeur: 'urgent', label: 'Urgent (panne, hiver)', poids: 3 },
    { valeur: '6_mois', label: 'Dans les 6 mois', poids: 2 },
    { valeur: 'reflexion', label: 'En réflexion', poids: 0 },
    { valeur: 'curieux', label: 'Pas intéressé / curiosité', poids: -2 },
  ] },
]

export interface QualificationPro {
  score: number
  temperature: TemperaturePro
  bloquants: string[]
  repondues: number
  total: number
  produits: string[]
}

export function qualifierPro(reponses: ReponsesPro | null | undefined): QualificationPro {
  const r = reponses || {}
  let score = 0
  let repondues = 0
  const bloquants: string[] = []
  for (const q of QUESTIONS_PRO) {
    const choix = q.options.find(o => o.valeur === r[q.id])
    if (!choix) continue
    repondues += 1
    score += choix.poids || 0
    if (choix.bloquant) bloquants.push(choix.bloquant)
  }
  const produits = produitsAProposer(r)
  const temperature: TemperaturePro = bloquants.length ? 'froid' : score >= 13 ? 'chaud' : score >= 7 ? 'tiede' : 'froid'
  return { score, temperature, bloquants, repondues, total: QUESTIONS_PRO.length, produits }
}

/** Produits à présenter à ce prospect, déduits de ses réponses. */
export function produitsAProposer(r: ReponsesPro): string[] {
  const p: string[] = []
  if (r.hauteur === 'oui') p.push('Déstratificateur')
  if (r.toiture === 'plate') p.push('Isolation de toiture plate')
  if (['gaz', 'fioul', 'electrique'].includes(r.chauffage)) p.push('Pompe à chaleur air/eau')
  if (r.chaud_froid === 'bassin' || r.chaud_froid === 'process') p.push('Pompe à chaleur flottante')
  if (r.chaud_froid === 'froid') p.push('HP flottante (groupe froid)')
  if (r.pv !== 'equipe' && (r.facture === 'plus_20k' || r.facture === '5k_20k')) p.push('Photovoltaïque')
  return p
}

export const LIBELLE_TEMPERATURE_PRO: Record<TemperaturePro, string> = { chaud: 'Chaud', tiede: 'Tiède', froid: 'Froid' }
