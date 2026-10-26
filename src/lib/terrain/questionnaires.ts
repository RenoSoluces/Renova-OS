/**
 * Questionnaires de qualification du porte-à-porte, selon le produit travaillé pendant la tournée.
 *
 * Chaque réponse porte un poids : la somme donne la température du contact (chaud / tiède / froid).
 * Une réponse « bloquante » (locataire, appartement pour une PAC, toit plein nord…) signale que le
 * produit n'est pas adapté : le contact reste noté, mais froid, avec la raison.
 */
export type ProduitTerrain = 'pac_air_eau' | 'pac_air_air' | 'chauffe_eau' | 'isolation' | 'photovoltaique' | 'menuiseries' | 'vmc' | 'renovation_globale'

export interface OptionQuestion { valeur: string; label: string; poids?: number; bloquant?: string }
export interface Question { id: string; label: string; options: OptionQuestion[]; aide?: string }
export interface Questionnaire { produit: ProduitTerrain; label: string; court: string; accroche: string; questions: Question[]; aVerifier: string[] }

/* ----------------------------------------------------------------- Questions communes */

const OCCUPATION: Question = { id: 'occupation', label: 'Statut', options: [
  { valeur: 'proprietaire', label: 'Propriétaire occupant', poids: 2 },
  { valeur: 'bailleur', label: 'Propriétaire bailleur', poids: 1 },
  { valeur: 'locataire', label: 'Locataire', bloquant: 'Locataire : le propriétaire doit porter les travaux' },
] }
const LOGEMENT_MAISON: Question = { id: 'logement', label: 'Logement', options: [
  { valeur: 'maison', label: 'Maison', poids: 1 },
  { valeur: 'appartement', label: 'Appartement', bloquant: 'Appartement : produit non adapté' },
] }
const LOGEMENT: Question = { id: 'logement', label: 'Logement', options: [
  { valeur: 'maison', label: 'Maison', poids: 1 },
  { valeur: 'appartement', label: 'Appartement' },
] }
const ANCIENNETE: Question = { id: 'anciennete', label: 'Construction', aide: 'Les aides exigent un logement de plus de 2 ans (15 ans pour MaPrimeRénov’).', options: [
  { valeur: 'avant_1975', label: 'Avant 1975', poids: 2 },
  { valeur: '1975_2000', label: '1975 – 2000', poids: 2 },
  { valeur: '2000_2012', label: '2000 – 2012', poids: 1 },
  { valeur: 'apres_2012', label: 'Après 2012' },
  { valeur: 'moins_2_ans', label: 'Moins de 2 ans', bloquant: 'Logement de moins de 2 ans : pas d’aides' },
] }
const FOYER: Question = { id: 'foyer', label: 'Personnes au foyer', options: ['1', '2', '3', '4', '5', '6+'].map(v => ({ valeur: v, label: v })) }
const REVENUS: Question = { id: 'revenus', label: 'Revenus (couleur MaPrimeRénov’)', aide: 'À demander avec tact ; « ne sait pas » est une bonne réponse.', options: [
  { valeur: 'TresModeste', label: 'Très modestes', poids: 2 },
  { valeur: 'Modeste', label: 'Modestes', poids: 2 },
  { valeur: 'Intermediaire', label: 'Intermédiaires', poids: 1 },
  { valeur: 'Aisee', label: 'Supérieurs' },
  { valeur: 'nsp', label: 'Ne sait pas' },
] }
const DECIDEUR: Question = { id: 'decideur', label: 'Décideurs présents au RDV', options: [
  { valeur: 'tous', label: 'Tous', poids: 1 },
  { valeur: 'conjoint_absent', label: 'Conjoint à convaincre', poids: -1 },
] }
const DELAI: Question = { id: 'delai', label: 'Projet', options: [
  { valeur: 'urgent', label: 'Urgent (panne, hiver)', poids: 3 },
  { valeur: '6_mois', label: 'Dans les 6 mois', poids: 2 },
  { valeur: 'reflexion', label: 'En réflexion', poids: 0 },
  { valeur: 'curieux', label: 'Simple curiosité', poids: -2 },
] }

const FACTURE_CHAUFFAGE: Question = { id: 'facture', label: 'Facture de chauffage / an', options: [
  { valeur: 'moins_1500', label: '< 1 500 €' },
  { valeur: '1500_2500', label: '1 500 – 2 500 €', poids: 1 },
  { valeur: 'plus_2500', label: '> 2 500 €', poids: 2 },
] }

/* ----------------------------------------------------------------- Questionnaires */

export const QUESTIONNAIRES: Questionnaire[] = [
  {
    produit: 'pac_air_eau', label: 'Pompe à chaleur air/eau', court: 'PAC air/eau',
    accroche: 'Remplacer la chaudière fioul ou gaz : une facture de chauffage divisée par 2 à 3, avec les aides de l’État.',
    questions: [OCCUPATION, LOGEMENT_MAISON,
      { id: 'chauffage', label: 'Chauffage actuel', options: [
        { valeur: 'fioul', label: 'Fioul', poids: 3 }, { valeur: 'gaz', label: 'Gaz', poids: 2 }, { valeur: 'propane', label: 'Propane', poids: 3 },
        { valeur: 'electrique', label: 'Électrique', poids: 0 }, { valeur: 'bois', label: 'Bois / granulés', poids: -1 }, { valeur: 'pac', label: 'Déjà une PAC', bloquant: 'Déjà équipé d’une pompe à chaleur' },
      ] },
      { id: 'emetteurs', label: 'Radiateurs', options: [
        { valeur: 'eau', label: 'Radiateurs à eau', poids: 2 }, { valeur: 'plancher', label: 'Plancher chauffant', poids: 2 },
        { valeur: 'electriques', label: 'Radiateurs électriques', bloquant: 'Pas de circuit d’eau chaude : proposer une PAC air/air' },
      ] },
      { id: 'age_chaudiere', label: 'Âge de la chaudière', options: [
        { valeur: 'moins_10', label: '< 10 ans' }, { valeur: '10_20', label: '10 – 20 ans', poids: 1 }, { valeur: 'plus_20', label: '> 20 ans', poids: 2 },
      ] },
      FACTURE_CHAUFFAGE, ANCIENNETE, FOYER, REVENUS, DELAI, DECIDEUR],
    aVerifier: ['Surface chauffée et isolation', 'Puissance de la chaudière (plaque)', 'Emplacement du groupe extérieur', 'Tableau électrique (mono / triphasé)'],
  },
  {
    produit: 'pac_air_air', label: 'Climatisation réversible (PAC air/air)', court: 'Clim réversible',
    accroche: 'Chauffer pour 3 fois moins cher qu’avec des radiateurs électriques, et rafraîchir l’été.',
    questions: [OCCUPATION, LOGEMENT,
      { id: 'chauffage', label: 'Chauffage actuel', options: [
        { valeur: 'electrique', label: 'Électrique', poids: 3 }, { valeur: 'fioul', label: 'Fioul', poids: 1 }, { valeur: 'gaz', label: 'Gaz', poids: 1 },
        { valeur: 'bois', label: 'Bois / poêle', poids: 1 }, { valeur: 'clim', label: 'Déjà climatisé', poids: -2 },
      ] },
      { id: 'pieces', label: 'Pièces à équiper', options: [
        { valeur: '1', label: '1', poids: 0 }, { valeur: '2', label: '2', poids: 1 }, { valeur: '3', label: '3', poids: 2 }, { valeur: '4+', label: '4 et +', poids: 2 },
      ] },
      { id: 'ete', label: 'Chaleur l’été', options: [{ valeur: 'oui', label: 'Souffre de la chaleur', poids: 2 }, { valeur: 'non', label: 'Non' }] },
      FACTURE_CHAUFFAGE, DELAI, DECIDEUR],
    aVerifier: ['Emplacement des unités intérieures', 'Passage des liaisons', 'Règlement de copropriété si appartement'],
  },
  {
    produit: 'chauffe_eau', label: 'Chauffe-eau thermodynamique', court: 'Chauffe-eau',
    accroche: 'Diviser par 3 la facture d’eau chaude en remplaçant le cumulus électrique.',
    questions: [OCCUPATION, LOGEMENT,
      { id: 'eau_chaude', label: 'Eau chaude actuelle', options: [
        { valeur: 'cumulus', label: 'Cumulus électrique', poids: 3 }, { valeur: 'chaudiere', label: 'Par la chaudière', poids: 1 },
        { valeur: 'gaz', label: 'Chauffe-eau gaz', poids: 1 }, { valeur: 'thermo', label: 'Déjà thermodynamique', bloquant: 'Déjà équipé' },
      ] },
      { id: 'age_ballon', label: 'Âge du ballon', options: [
        { valeur: 'moins_8', label: '< 8 ans' }, { valeur: '8_15', label: '8 – 15 ans', poids: 1 }, { valeur: 'plus_15', label: '> 15 ans', poids: 2 },
      ] },
      { id: 'emplacement', label: 'Pièce disponible', aide: 'Garage, cellier ou buanderie de plus de 20 m³, ou version split.', options: [
        { valeur: 'oui', label: 'Garage / cellier', poids: 1 }, { valeur: 'split', label: 'Non (version split)', poids: 0 },
      ] },
      FOYER, DELAI],
    aVerifier: ['Volume de la pièce', 'Évacuation des condensats', 'Arrivée d’eau et protection électrique'],
  },
  {
    produit: 'isolation', label: 'Isolation des combles', court: 'Isolation',
    accroche: '30 % de la chaleur part par le toit : isoler les combles est le geste le plus rentable.',
    questions: [OCCUPATION, LOGEMENT_MAISON,
      { id: 'combles', label: 'Combles', options: [
        { valeur: 'perdus', label: 'Perdus (non habités)', poids: 2 }, { valeur: 'amenages', label: 'Aménagés', poids: 1 }, { valeur: 'toit_plat', label: 'Toit plat', poids: -1 },
      ] },
      { id: 'isolation_actuelle', label: 'Isolation actuelle', options: [
        { valeur: 'aucune', label: 'Aucune', poids: 3 }, { valeur: 'ancienne', label: 'Ancienne / tassée', poids: 2 },
        { valeur: 'recente', label: 'Récente (< 10 ans)', bloquant: 'Isolation récente : peu de gain' }, { valeur: 'nsp', label: 'Ne sait pas', poids: 1 },
      ] },
      { id: 'acces', label: 'Accès aux combles', options: [{ valeur: 'trappe', label: 'Trappe accessible', poids: 1 }, { valeur: 'difficile', label: 'Difficile', poids: -1 }] },
      ANCIENNETE, FOYER, REVENUS, DELAI],
    aVerifier: ['Surface à isoler', 'Hauteur sous faîtage', 'Spots, gaines et conduits de cheminée', 'Présence de VMC'],
  },
  {
    produit: 'photovoltaique', label: 'Panneaux solaires', court: 'Solaire',
    accroche: 'Produire et consommer sa propre électricité en journée : chaque kWh solaire consommé sur place est un kWh qui n’est plus acheté.',
    questions: [OCCUPATION, LOGEMENT_MAISON,
      { id: 'orientation', label: 'Orientation du toit', options: [
        { valeur: 'sud', label: 'Sud', poids: 3 }, { valeur: 'sud_est_ouest', label: 'Sud-Est / Sud-Ouest', poids: 2 }, { valeur: 'est_ouest', label: 'Est / Ouest', poids: 1 },
        { valeur: 'nord', label: 'Nord', bloquant: 'Toit orienté nord' },
      ] },
      { id: 'ombrage', label: 'Ombrage', options: [{ valeur: 'aucun', label: 'Aucun', poids: 1 }, { valeur: 'partiel', label: 'Partiel' }, { valeur: 'fort', label: 'Fort (arbres, immeuble)', poids: -3 }] },
      { id: 'toiture', label: 'État de la toiture', options: [{ valeur: 'bon', label: 'Bon', poids: 1 }, { valeur: 'a_refaire', label: 'À refaire', poids: -2 }, { valeur: 'amiante', label: 'Fibrociment / amiante', bloquant: 'Toiture amiantée : désamiantage préalable' }] },
      { id: 'facture_elec', label: 'Facture d’électricité / an', options: [
        { valeur: 'moins_1000', label: '< 1 000 €' }, { valeur: '1000_2000', label: '1 000 – 2 000 €', poids: 1 }, { valeur: 'plus_2000', label: '> 2 000 €', poids: 2 },
      ] },
      { id: 'presence', label: 'Présence en journée', options: [{ valeur: 'oui', label: 'Retraité / télétravail', poids: 2 }, { valeur: 'non', label: 'Absent la journée' }] },
      { id: 'vehicule', label: 'Véhicule électrique', options: [{ valeur: 'oui', label: 'Oui / projet', poids: 1 }, { valeur: 'non', label: 'Non' }] },
      DELAI, DECIDEUR],
    aVerifier: ['Surface de toiture exploitable', 'Type de couverture', 'Compteur Linky et puissance souscrite', 'PLU / Bâtiments de France'],
  },
  {
    produit: 'menuiseries', label: 'Fenêtres et portes', court: 'Fenêtres',
    accroche: 'Fini les courants d’air et le bruit : des fenêtres neuves, posées en une journée.',
    questions: [OCCUPATION, LOGEMENT,
      { id: 'vitrage', label: 'Menuiseries actuelles', options: [
        { valeur: 'simple', label: 'Simple vitrage', poids: 3 }, { valeur: 'double_ancien', label: 'Double vitrage ancien', poids: 1 }, { valeur: 'recent', label: 'Récentes', bloquant: 'Menuiseries récentes' },
      ] },
      { id: 'nombre', label: 'Nombre de fenêtres', options: [{ valeur: '1_3', label: '1 – 3' }, { valeur: '4_8', label: '4 – 8', poids: 1 }, { valeur: '9+', label: '9 et +', poids: 2 }] },
      { id: 'volets', label: 'Volets', options: [{ valeur: 'oui', label: 'Volets à changer', poids: 1 }, { valeur: 'non', label: 'Non' }] },
      ANCIENNETE, DELAI, DECIDEUR],
    aVerifier: ['Dimensions (tableau)', 'Pose en rénovation ou en dépose totale', 'Couleur et matériau'],
  },
  {
    produit: 'vmc', label: 'Ventilation (VMC)', court: 'VMC',
    accroche: 'Un air sain, sans humidité ni moisissures, pour quelques euros par an.',
    questions: [OCCUPATION, LOGEMENT,
      { id: 'ventilation', label: 'Ventilation actuelle', options: [{ valeur: 'aucune', label: 'Aucune', poids: 2 }, { valeur: 'ancienne', label: 'VMC ancienne', poids: 1 }, { valeur: 'recente', label: 'VMC récente', bloquant: 'Déjà équipé' }] },
      { id: 'humidite', label: 'Humidité', options: [{ valeur: 'oui', label: 'Condensation / moisissures', poids: 3 }, { valeur: 'non', label: 'Non' }] },
      FOYER, DELAI],
    aVerifier: ['Accès aux combles pour le caisson', 'Pièces humides à raccorder'],
  },
  {
    produit: 'renovation_globale', label: 'Rénovation d’ampleur', court: 'Réno globale',
    accroche: 'Gagner au moins 2 classes de DPE avec un accompagnement de A à Z et jusqu’à 90 % d’aides.',
    questions: [OCCUPATION, LOGEMENT_MAISON,
      { id: 'dpe', label: 'DPE connu', options: [
        { valeur: 'fg', label: 'F ou G', poids: 3 }, { valeur: 'e', label: 'E', poids: 2 }, { valeur: 'd', label: 'D', poids: 1 }, { valeur: 'abc', label: 'A, B ou C', bloquant: 'Logement déjà performant' }, { valeur: 'nsp', label: 'Ne sait pas', poids: 1 },
      ] },
      { id: 'chauffage', label: 'Chauffage', options: [
        { valeur: 'fioul', label: 'Fioul', poids: 3 }, { valeur: 'gaz', label: 'Gaz', poids: 2 }, { valeur: 'electrique', label: 'Électrique', poids: 2 }, { valeur: 'bois', label: 'Bois' }, { valeur: 'pac', label: 'PAC' },
      ] },
      { id: 'isolation_actuelle', label: 'Isolation', options: [{ valeur: 'aucune', label: 'Peu ou pas isolé', poids: 2 }, { valeur: 'partielle', label: 'Partielle', poids: 1 }, { valeur: 'bonne', label: 'Bien isolé' }] },
      FACTURE_CHAUFFAGE, ANCIENNETE, FOYER, REVENUS, DELAI, DECIDEUR],
    aVerifier: ['Audit énergétique à programmer', 'Mon Accompagnateur Rénov’', 'Plan de financement (éco-PTZ)'],
  },
]

export const questionnaireDe = (produit?: string | null) => QUESTIONNAIRES.find(q => q.produit === produit) || null

export type Temperature = 'chaud' | 'tiede' | 'froid'
export interface Qualification { score: number; temperature: Temperature; bloquants: string[]; repondues: number; total: number }

export function qualifier(produit: string | null | undefined, reponses: Record<string, string> | undefined): Qualification | null {
  const q = questionnaireDe(produit)
  if (!q) return null
  let score = 0
  let repondues = 0
  const bloquants: string[] = []
  for (const question of q.questions) {
    const valeur = reponses?.[question.id]
    if (!valeur) continue
    repondues++
    const option = question.options.find(o => o.valeur === valeur)
    if (!option) continue
    score += option.poids || 0
    if (option.bloquant) bloquants.push(option.bloquant)
  }
  const temperature: Temperature = bloquants.length ? 'froid' : score >= 8 ? 'chaud' : score >= 3 ? 'tiede' : 'froid'
  return { score, temperature, bloquants, repondues, total: q.questions.length }
}

/** Résumé lisible des réponses, pour la fiche prospect et l'historique. */
export function resumeReponses(produit: string | null | undefined, reponses: Record<string, string> | undefined): string {
  const q = questionnaireDe(produit)
  if (!q || !reponses) return ''
  const lignes = q.questions
    .map(question => {
      const option = question.options.find(o => o.valeur === reponses[question.id])
      return option ? `${question.label} : ${option.label}` : ''
    })
    .filter(Boolean)
  return lignes.length ? `Questionnaire ${q.court} — ${lignes.join(' · ')}` : ''
}

const LIBELLE_TEMPERATURE: Record<Temperature, string> = { chaud: 'Chaud', tiede: 'Tiède', froid: 'Froid' }
export const libelleTemperature = (t: Temperature) => LIBELLE_TEMPERATURE[t]

/** Champs de la fiche prospect déduits des réponses. */
export function champsProspectDepuisReponses(reponses: Record<string, string> | undefined): Record<string, unknown> {
  const r = reponses || {}
  const champs: Record<string, unknown> = {}
  if (r.occupation === 'proprietaire') champs.statut_occupation = 'propriétaire_occupant'
  else if (r.occupation === 'bailleur') champs.statut_occupation = 'bailleur'
  else if (r.occupation === 'locataire') champs.statut_occupation = 'locataire'
  if (r.foyer) champs.nombre_personnes_foyer = r.foyer === '6+' ? 6 : Number(r.foyer)
  if (r.revenus && r.revenus !== 'nsp') champs.categorie_mpr = r.revenus
  return champs
}
