import { zoneClimatiqueDepuisCodePostal } from '../3cl/database/departementsZones'
import type { ResultatSimulationPV } from './calculProduction'

/**
 * Simulateur solaire (parcours commercial dédié).
 *
 * Formule de production (méthode simple recommandée par l'ADEME) :
 *
 *   Production annuelle (kWh) = Puissance (kWc) × Coefficient d'orientation × Heures d'ensoleillement par an
 *
 * - Le coefficient d'orientation vaut 1 plein Sud et diminue pour les autres orientations ;
 *   il intègre ici l'inclinaison du toit (optimum ≈ 30°).
 * - Les heures d'ensoleillement (équivalent pleine puissance) dépendent de la zone géographique.
 *   Les valeurs proposées par zone sont INDICATIVES : le conseiller peut les remplacer par la valeur
 *   donnée par le simulateur ADEME pour la commune du client (champ modifiable dans le parcours).
 *
 * Les tarifs ne sont pas codés en dur dans le calcul : le prix du kWh est saisi en direct devant le
 * prospect ; le tarif de rachat du surplus est de 0,04 €/kWh ; il n'y a plus de prime à l'autoconsommation.
 */

export type OrientationToit = 'sud' | 'sud_est' | 'sud_ouest' | 'est' | 'ouest' | 'nord_est' | 'nord_ouest' | 'nord'
export type ProfilPresence = 'absent_journee' | 'mixte' | 'present_journee'

export const ORIENTATIONS: { value: OrientationToit; label: string; court: string; coefficient: number; angle: number }[] = [
  { value: 'sud', label: 'Sud', court: 'S', coefficient: 1.0, angle: 180 },
  { value: 'sud_est', label: 'Sud-Est', court: 'SE', coefficient: 0.94, angle: 135 },
  { value: 'sud_ouest', label: 'Sud-Ouest', court: 'SO', coefficient: 0.94, angle: 225 },
  { value: 'est', label: 'Est', court: 'E', coefficient: 0.84, angle: 90 },
  { value: 'ouest', label: 'Ouest', court: 'O', coefficient: 0.84, angle: 270 },
  { value: 'nord_est', label: 'Nord-Est', court: 'NE', coefficient: 0.65, angle: 45 },
  { value: 'nord_ouest', label: 'Nord-Ouest', court: 'NO', coefficient: 0.65, angle: 315 },
  { value: 'nord', label: 'Nord', court: 'N', coefficient: 0.55, angle: 0 },
]

/** Heures d'ensoleillement annuelles équivalentes (kWh/kWc/an, plein Sud, inclinaison optimale), par zone climatique. Valeurs indicatives. */
export const HEURES_PAR_ZONE: Record<string, number> = {
  H1a: 1000, H1b: 980, H1c: 1020, H2a: 1080, H2b: 1150, H2c: 1120, H2d: 1300, H3: 1350,
}
export const HEURES_PAR_DEFAUT = 1100

export const MASQUES: { value: 'aucun' | 'faible' | 'moyen' | 'fort'; label: string; coefficient: number }[] = [
  { value: 'aucun', label: 'Aucun', coefficient: 1 },
  { value: 'faible', label: 'Faibles', coefficient: 0.95 },
  { value: 'moyen', label: 'Moyens', coefficient: 0.85 },
  { value: 'fort', label: 'Importants', coefficient: 0.7 },
]

export const PROFILS_PRESENCE: { value: ProfilPresence; label: string; desc: string; tauxBase: number }[] = [
  { value: 'absent_journee', label: 'Absent en journée', desc: 'Travail à l’extérieur, maison vide de 8 h à 18 h', tauxBase: 0.3 },
  { value: 'mixte', label: 'Présence partielle', desc: 'Télétravail partiel, retraités actifs, horaires décalés', tauxBase: 0.4 },
  { value: 'present_journee', label: 'Présent en journée', desc: 'Télétravail, retraités, équipements programmables', tauxBase: 0.5 },
]

export const TARIF_RACHAT_SURPLUS = 0.04 // €/kWh
export const PUISSANCE_PANNEAU_KWC = 0.45
export const SURFACE_PANNEAU_M2 = 1.95
const GAIN_BATTERIE = 0.25
const PLAFOND_AUTOCONSO = 0.85

/** Répartition mensuelle indicative de la production en France métropolitaine (somme = 1). */
const PART_PRODUCTION_BRUTE = [0.035, 0.055, 0.09, 0.112, 0.127, 0.134, 0.139, 0.121, 0.094, 0.064, 0.031, 0.028]
const PART_PRODUCTION_MENSUELLE = PART_PRODUCTION_BRUTE.map(p => p / PART_PRODUCTION_BRUTE.reduce((a, b) => a + b, 0))
/** Répartition mensuelle indicative de la consommation d'un foyer (plus élevée l'hiver). */
const PART_CONSO_MENSUELLE = [0.115, 0.105, 0.095, 0.082, 0.07, 0.06, 0.058, 0.058, 0.066, 0.079, 0.099, 0.113]
export const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export interface EntreeSolaire {
  codePostal: string
  /** Prix du kWh payé par le client, saisi en direct (€/kWh TTC). */
  prixKwh: number | null
  consommationAnnuelleKwh: number | null
  factureMensuelleEur: number | null
  profil: ProfilPresence
  puissanceCompteurKva: number | null
  typeRaccordement: 'monophase' | 'triphase'
  orientation: OrientationToit
  inclinaisonDeg: number | null
  surfaceDisponibleM2: number | null
  nombrePans: number
  masques: 'aucun' | 'faible' | 'moyen' | 'fort'
  puissanceKwc: number
  batterie: boolean
  /** Remplace le coefficient d'orientation calculé (valeur ADEME, si le conseiller la connaît). */
  coefficientOrientationManuel: number | null
  /** Remplace les heures d'ensoleillement proposées pour la zone (valeur du simulateur ADEME). */
  heuresEnsoleillementManuel: number | null
  prixInstallationTtc: number | null
  inflationKwhPct: number
  degradationPanneauxPct: number
}

export const ENTREE_PAR_DEFAUT: EntreeSolaire = {
  codePostal: '', prixKwh: null, consommationAnnuelleKwh: null, factureMensuelleEur: null,
  profil: 'mixte', puissanceCompteurKva: null, typeRaccordement: 'monophase',
  orientation: 'sud', inclinaisonDeg: 30, surfaceDisponibleM2: null, nombrePans: 1, masques: 'aucun',
  puissanceKwc: 6, batterie: false,
  coefficientOrientationManuel: null, heuresEnsoleillementManuel: null, prixInstallationTtc: null,
  inflationKwhPct: 3, degradationPanneauxPct: 0.5,
}

export function coefficientInclinaison(deg: number | null | undefined): number {
  if (deg == null) return 0.97
  const ecart = Math.abs(deg - 30)
  if (ecart <= 5) return 1
  if (ecart <= 15) return 0.97
  if (ecart <= 25) return 0.92
  if (ecart <= 40) return 0.85
  return 0.75
}

export function zoneDepuisCodePostal(cp: string): string {
  return zoneClimatiqueDepuisCodePostal(cp)
}

export function heuresPourZone(zone: string): number {
  return HEURES_PAR_ZONE[zone] ?? HEURES_PAR_DEFAUT
}

export interface PointAnnuel { annee: number; production: number; gain: number; cumul: number }

export interface ResultatSolaire {
  /** true tant que le prix du kWh n'est pas renseigné : les montants en euros ne sont pas calculables. */
  prixManquant: boolean
  zone: string
  puissanceKwc: number
  nombrePanneaux: number
  surfaceNecessaireM2: number
  coefficientOrientation: number
  coefficientMasques: number
  heuresEnsoleillement: number
  productionAnnuelle: number
  consommationAnnuelle: number | null
  tauxAutoconsommation: number
  energieAutoconsommee: number
  energieRevendue: number
  tauxCouverture: number | null
  economieAutoconsommation: number
  revenuRevente: number
  gainAnnuel: number
  investissement: number
  investissementEstime: boolean
  delaiRetourAnnees: number | null
  gain20Ans: number
  productionMensuelle: number[]
  consommationMensuelle: number[] | null
  trajectoire: PointAnnuel[]
  alertes: string[]
}

const arrondi = (n: number, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f }

/** Consommation retenue : saisie directe, sinon déduite de la facture mensuelle et du prix du kWh. */
export function consommationRetenue(e: EntreeSolaire): number | null {
  if (e.consommationAnnuelleKwh && e.consommationAnnuelleKwh > 0) return e.consommationAnnuelleKwh
  if (e.factureMensuelleEur && e.prixKwh && e.prixKwh > 0) return Math.round((e.factureMensuelleEur * 12) / e.prixKwh)
  return null
}

export function simulerSolaire(e: EntreeSolaire): ResultatSolaire {
  const zone = zoneDepuisCodePostal(e.codePostal)
  const heures = e.heuresEnsoleillementManuel && e.heuresEnsoleillementManuel > 0 ? e.heuresEnsoleillementManuel : heuresPourZone(zone)
  const orient = ORIENTATIONS.find(o => o.value === e.orientation) ?? ORIENTATIONS[0]
  const coefOrientation = e.coefficientOrientationManuel && e.coefficientOrientationManuel > 0
    ? e.coefficientOrientationManuel
    : arrondi(orient.coefficient * coefficientInclinaison(e.inclinaisonDeg), 2)
  const coefMasques = (MASQUES.find(m => m.value === e.masques) ?? MASQUES[0]).coefficient

  const puissance = Math.max(0, e.puissanceKwc || 0)
  const nombrePanneaux = Math.max(0, Math.round(puissance / PUISSANCE_PANNEAU_KWC))
  const surfaceNecessaire = arrondi(nombrePanneaux * SURFACE_PANNEAU_M2, 1)

  // Formule ADEME : puissance × coefficient d'orientation × heures d'ensoleillement (× masques si présents)
  const production = Math.round(puissance * coefOrientation * heures * coefMasques)

  const conso = consommationRetenue(e)
  const profil = PROFILS_PRESENCE.find(p => p.value === e.profil) ?? PROFILS_PRESENCE[1]
  let taux = Math.min(PLAFOND_AUTOCONSO, profil.tauxBase + (e.batterie ? GAIN_BATTERIE : 0))
  let autoconsommee = Math.round(production * taux)
  if (conso != null) autoconsommee = Math.min(autoconsommee, Math.round(conso * 0.95))
  autoconsommee = Math.min(autoconsommee, production)
  taux = production > 0 ? autoconsommee / production : 0
  const revendue = production - autoconsommee

  const prixManquant = !(e.prixKwh && e.prixKwh > 0)
  const prix = e.prixKwh && e.prixKwh > 0 ? e.prixKwh : 0
  const economie = Math.round(autoconsommee * prix)
  const revenu = Math.round(revendue * TARIF_RACHAT_SURPLUS)
  const gainAnnuel = economie + revenu

  const investissementEstime = !(e.prixInstallationTtc && e.prixInstallationTtc > 0)
  const investissement = e.prixInstallationTtc && e.prixInstallationTtc > 0
    ? e.prixInstallationTtc
    : Math.round(puissance * 2200 + (e.batterie ? 5500 : 0))

  // Trajectoire sur 20 ans : prix du kWh en hausse, panneaux qui se dégradent légèrement.
  const trajectoire: PointAnnuel[] = []
  let cumul = -investissement
  let delai: number | null = null
  for (let an = 1; an <= 20; an++) {
    const facteurProd = (1 - e.degradationPanneauxPct / 100) ** (an - 1)
    const facteurPrix = (1 + e.inflationKwhPct / 100) ** (an - 1)
    const prod = production * facteurProd
    const auto = Math.min(prod, autoconsommee * facteurProd)
    const gain = auto * prix * facteurPrix + (prod - auto) * TARIF_RACHAT_SURPLUS
    const avant = cumul
    cumul += gain
    if (delai == null && cumul >= 0 && gain > 0) delai = arrondi(an - 1 + -avant / gain, 1)
    trajectoire.push({ annee: an, production: Math.round(prod), gain: Math.round(gain), cumul: Math.round(cumul) })
  }

  const alertes: string[] = []
  if (e.surfaceDisponibleM2 && surfaceNecessaire > e.surfaceDisponibleM2 * 1.05)
    alertes.push(`La puissance choisie nécessite environ ${surfaceNecessaire} m² de toiture pour ${e.surfaceDisponibleM2} m² disponibles.`)
  if (e.masques === 'fort') alertes.push('Masques solaires importants : la production réelle peut être nettement inférieure à l’estimation.')
  if (e.orientation === 'nord' || e.orientation === 'nord_est' || e.orientation === 'nord_ouest')
    alertes.push('Orientation défavorable : étudier un autre pan de toiture ou une pose au sol.')
  if (puissance > 6 && e.typeRaccordement === 'monophase') alertes.push('Au-delà de 6 kWc, un raccordement triphasé est généralement nécessaire : à vérifier.')
  if (conso != null && production > conso * 1.3) alertes.push('La production dépasse nettement la consommation : une puissance plus faible serait plus rentable.')

  const partsConso = conso != null ? PART_CONSO_MENSUELLE.map(p => Math.round(conso * p)) : null

  return {
    prixManquant, zone, puissanceKwc: puissance, nombrePanneaux, surfaceNecessaireM2: surfaceNecessaire,
    coefficientOrientation: coefOrientation, coefficientMasques: coefMasques, heuresEnsoleillement: heures,
    productionAnnuelle: production, consommationAnnuelle: conso, tauxAutoconsommation: taux,
    energieAutoconsommee: autoconsommee, energieRevendue: revendue,
    tauxCouverture: conso ? Math.min(1, autoconsommee / conso) : null,
    economieAutoconsommation: economie, revenuRevente: revenu, gainAnnuel,
    investissement, investissementEstime, delaiRetourAnnees: prixManquant ? null : delai,
    gain20Ans: trajectoire[19].cumul + investissement,
    productionMensuelle: PART_PRODUCTION_MENSUELLE.map(p => Math.round(production * p)),
    consommationMensuelle: partsConso, trajectoire, alertes,
  }
}

/** Adaptateur vers le format attendu par la création de devis et le rapport de visite existants. */
export function versResultatSimulationPV(r: ResultatSolaire): ResultatSimulationPV {
  return {
    puissanceInstallee: r.puissanceKwc,
    surfaceNecessaire: r.surfaceNecessaireM2,
    productionAnnuelle: r.productionAnnuelle,
    productibleUnitaire: Math.round(r.coefficientOrientation * r.heuresEnsoleillement * r.coefficientMasques),
    tauxAutoconsommation: r.tauxAutoconsommation,
    energieAutoconsommee: r.energieAutoconsommee,
    energieRevendue: r.energieRevendue,
    economieAutoconsommation: r.economieAutoconsommation,
    revenuRevente: r.revenuRevente,
    gainAnnuelTotal: r.gainAnnuel,
    investissementEstime: r.investissement,
    coutParKwcUtilise: r.puissanceKwc > 0 ? Math.round(r.investissement / r.puissanceKwc) : 0,
    primeAutoconsommation: 0, // la prime à l'autoconsommation n'existe plus
    investissementNet: r.investissement,
    dureeAmortissementAnnees: r.delaiRetourAnnees,
    alerteSurfaceInsuffisante: r.alertes.some(a => a.includes('m² de toiture')),
    alerteMasquesImportants: r.coefficientMasques < 0.75,
  }
}
