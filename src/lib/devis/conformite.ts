/**
 * Moteur de conformité des devis (CEE + MaPrimeRénov').
 *
 * Contrôle un devis au fil de la saisie avec les critères des fiches d'opérations
 * standardisées intégrées dans `reglesFichesCEE.ts` et les règles MaPrimeRénov'
 * « par geste » en vigueur depuis le 01/09/2026.
 *
 * Ce module est volontairement indépendant de React et de Supabase : il ne dépend que
 * de types structurels minimaux, donc il se teste facilement.
 *
 * ⚠️ Il applique les règles qui y sont intégrées. L'instruction finale reste faite par
 * le délégataire CEE et par l'Anah.
 */
import { REGLES_FICHES, DATE_REGLES } from './reglesFichesCEE'

export { DATE_REGLES }

/* ------------------------------------------------------------------ types */

export type Gravite = 'bloc' | 'info'

export interface PointConformite {
  groupe: string
  gravite: Gravite
  message: string
  /** clé du champ de fiche concerné (pour surligner l'input) */
  champ?: string
  ligneId?: string
}

export type CategorieRevenus = 'tres_modestes' | 'modestes' | 'intermediaires' | 'superieurs' | null

export interface LogementConformite {
  type: string            // 'Maison individuelle' | 'Appartement'
  annee: string
  zone: string            // 'H1' | 'H2' | 'H3'
  surface: string
  energie: string
  residencePrincipale: boolean
  fossileConserve: boolean
}

export interface ConformiteMeta {
  logement: LogementConformite
  statutDemandeur: string // 'Propriétaire occupant' | 'Propriétaire bailleur' | 'Locataire'
  pro: {
    rge: string
    organisme: string
    validite: string      // yyyy-mm-dd
    assurance: string
    /** fiche -> « la qualification couvre cette opération » */
    couvre: Record<string, boolean>
  }
  dates: {
    visite: string
    debut: string
    duree: string
    acompte: string
  }
  oblige: string          // nom de l'obligé / délégataire CEE
  venteHorsEtablissement: boolean
}

export const META_PAR_DEFAUT: ConformiteMeta = {
  logement: { type: 'Maison individuelle', annee: '', zone: '', surface: '', energie: '', residencePrincipale: true, fossileConserve: false },
  statutDemandeur: 'Propriétaire occupant',
  pro: { rge: '', organisme: '', validite: '', assurance: '', couvre: {} },
  dates: { visite: '', debut: '', duree: '', acompte: '30' },
  oblige: '',
  venteHorsEtablissement: false,
}

/** Fusionne une valeur stockée (éventuellement partielle) avec les valeurs par défaut. */
export function fusionnerMeta(stocke: unknown, defauts: ConformiteMeta = META_PAR_DEFAUT): ConformiteMeta {
  const s = (stocke && typeof stocke === 'object' ? stocke : {}) as Partial<ConformiteMeta>
  return {
    ...defauts,
    ...s,
    logement: { ...defauts.logement, ...(s.logement || {}) },
    pro: { ...defauts.pro, ...(s.pro || {}), couvre: { ...defauts.pro.couvre, ...(s.pro?.couvre || {}) } },
    dates: { ...defauts.dates, ...(s.dates || {}) },
  }
}

/** Types structurels minimaux : compatibles avec Produit / DevisLigne / DevisAide du projet. */
export interface ProduitMin {
  id: string
  nom: string
  categorie?: string | null
  fiche_cee?: string | null
  eligible_cee?: boolean | null
  eligible_mpr?: boolean | null
  marque?: string | null
  reference?: string | null
  caracteristiques?: Record<string, any> | null
}
export interface LigneMin {
  id: string
  produit_id: string | null
  designation: string
  caracteristiques?: Record<string, any> | null
  description?: string | null
  quantite?: number | null
  prix_unitaire_ht?: number | null
}
export interface AideMin { type: string; montant: number }

export interface ContexteConformite {
  lignes: LigneMin[]
  produits: ProduitMin[]
  aides: AideMin[]
  meta: ConformiteMeta
  /** total TTC du devis, pour le plafond de cumul des aides */
  totalTTC: number
  categorieRevenus: CategorieRevenus
  societe: { siret?: string | null }
  client: { nom?: string | null; adresse?: string | null }
  devis: { dateValidite?: string | null; dateDevis?: string | null; dateSignature?: string | null }
  /** date du jour (yyyy-mm-dd), injectable pour les tests */
  aujourdhui?: string
}

/* ----------------------------------------------------- champs de fiche */

export interface ChampFiche {
  /** autres clés possibles dans `caracteristiques` (catalogue existant) */
  alias?: string[]
  k: string
  /** libellé : sert aussi de clé dans `caracteristiques` (donc visible sur le devis et le PDF) */
  l: string
  u?: string
  type?: 'texte' | 'nombre' | 'choix' | 'case'
  options?: string[]
}

const CLASSES = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
const PROFILS = ['M', 'L', 'XL', 'XXL']

export const CHAMPS_FICHE: Record<string, ChampFiche[]> = {
  'BAR-TH-171': [
    { k: 'usage', l: 'Usage', type: 'choix', options: ['Chauffage seul', 'Chauffage et eau chaude sanitaire'] },
    { k: 'temp', l: 'Régime de température', type: 'choix', options: ['Basse température', 'Moyenne ou haute température'] },
    { k: 'etas', l: 'Efficacité énergétique saisonnière ηs', u: '%', type: 'nombre' },
    { k: 'regulateur', l: 'Classe du régulateur', type: 'choix', options: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
    { k: 'note', l: 'Note de dimensionnement jointe', type: 'case' },
  ],
  'BAR-TH-172': [
    { k: 'usage', l: 'Usage de la PAC', type: 'choix', options: ['Chauffage seul', 'Chauffage + eau chaude sanitaire'] },
    { k: 'temp', l: 'Type d’application', type: 'choix', options: ['Basse température', 'Moyenne ou haute température'] },
    { k: 'captage', l: 'Type d’eau du captage', type: 'choix', options: ['Eau de nappe (eau/eau)', 'Eau glycolée (eau glycolée/eau)'] },
    { k: 'etas', l: 'Efficacité énergétique saisonnière ηs', u: '%', type: 'nombre' },
    { k: 'regulateur', l: 'Classe du régulateur', type: 'choix', options: ['IV', 'V', 'VI', 'VII', 'VIII'] },
    { k: 'note', l: 'Note de dimensionnement conforme à l’installation', type: 'case' },
    { k: 'systeme_ecs_marque_identique', l: 'Système ECS déporté de même marque que la PAC (si présent)', type: 'choix', options: ['Oui', 'Non', 'Sans objet'] },
  ],
  'BAR-TH-129': [
    { k: 'puissance', l: 'Puissance calorifique', u: 'kW', type: 'nombre' },
    { k: 'scop', l: 'SCOP', type: 'nombre' },
  ],
  'BAR-TH-148': [
    { k: 'profil', l: 'Profil de soutirage', type: 'choix', options: PROFILS },
    { k: 'efficacite', l: 'Efficacité énergétique', u: '%', type: 'nombre' },
  ],
  'BAR-TH-101': [
    { k: 'surface', l: 'Surface hors-tout des capteurs', u: 'm²', type: 'nombre' },
    { k: 'certif', l: 'Certification des capteurs', type: 'texte' },
    { k: 'ballon', l: 'Volume du ballon', u: 'L', type: 'nombre' },
    { k: 'classe', l: 'Classe du ballon', type: 'choix', options: CLASSES },
    { k: 'profil', l: 'Profil de soutirage', type: 'choix', options: PROFILS },
    { k: 'appoint', l: 'Appoint', type: 'choix', options: ['Électrique (effet Joule)', 'Autre énergie'] },
    { k: 'efficacite', l: 'Efficacité énergétique ECS', u: '%', type: 'nombre' },
    { k: 'thermosiphon', l: 'Thermosiphon ou auto-stockeur', type: 'choix', options: ['Non', 'Oui'] },
    { k: 'couvre', l: 'Couvre la totalité du besoin en ECS', type: 'case' },
  ],
  'BAR-TH-168': [
    { k: 'usage', l: 'Usage', type: 'choix', options: ['Chauffage et eau chaude sanitaire', 'Eau chaude sanitaire seule'] },
    { k: 'surface', l: 'Surface hors-tout des capteurs', u: 'm²', type: 'nombre' },
    { k: 'puiss_m2', l: 'Puissance des capteurs', u: 'W/m²', type: 'nombre' },
    { k: 'certif', l: 'Certification des capteurs', type: 'texte' },
    { k: 'ballon', l: 'Volume du ballon', u: 'L', type: 'nombre' },
    { k: 'classe', l: 'Classe du ballon', type: 'choix', options: CLASSES },
  ],
  'BAR-EN-101': [
    { k: 'zone', l: 'Partie isolée', type: 'choix', options: ['Comble perdu', 'Rampant de toiture'] },
    { k: 'r', l: 'Résistance thermique R', u: 'm².K/W', type: 'nombre', alias: ['resistance_thermique', 'resistance_thermique_R_m2K_W', 'R'] },
  ],
  'BAR-EN-102': [{ k: 'r', l: 'Résistance thermique R', u: 'm².K/W', type: 'nombre', alias: ['resistance_thermique', 'resistance_thermique_R_m2K_W', 'R'] }],
  'BAR-EN-103': [
    { k: 'r', l: 'Résistance thermique R', u: 'm².K/W', type: 'nombre', alias: ['resistance_thermique', 'resistance_thermique_R_m2K_W', 'R'] },
    { k: 'parevapeur', l: 'Pare-vapeur', type: 'choix', options: ['Oui', 'Non'] },
  ],
  'BAR-EN-104': [
    { k: 'typef', l: 'Type de menuiserie', type: 'choix', options: ['Fenêtre ou porte-fenêtre', 'Fenêtre de toiture', 'Double fenêtre'], alias: ['type_menuiserie'] },
    { k: 'uw', l: 'Coefficient Uw', u: 'W/m².K', type: 'nombre', alias: ['coefficient_Uw_W_m2K', 'Uw_W_m2K', 'coefficient_uw', 'Uw', 'uw'] },
    { k: 'sw', l: 'Facteur solaire Sw', type: 'nombre', alias: ['facteur_solaire_Sw', 'facteur_solaire', 'coefficient_Sw', 'Sw', 'sw'] },
    { k: 'surface', l: 'Surface totale des menuiseries', u: 'm²', type: 'nombre' },
  ],
  'BAR-TH-127': [
    // BAR-TH-127 exige un avis technique valide : l'option « Sans objet » (toujours bloquante) est retirée.
    { k: 'avis', l: 'Avis technique CCFAT valide (si applicable)', type: 'choix', options: ['Oui', 'Non'] },
    { k: 'kind', l: 'Type de VMC hygroréglable', type: 'choix', options: ['A', 'B'] },
  ],
  'BAR-TH-125': [
    { k: 'rendement', l: 'Rendement de récupération de chaleur', u: '%', type: 'nombre', alias: ['rendement_pct', 'rendement'] },
    { k: 'type', l: 'Système double flux haute performance', type: 'choix', options: ['Oui', 'Non'] },
  ],
  'BAR-TH-143': [
    { k: 'type_ssc', l: 'Configuration du système solaire combiné', type: 'choix', options: ['Chauffage + eau chaude sanitaire'] },
    { k: 'surface_capteurs', l: 'Surface hors-tout des capteurs solaires', u: 'm²', type: 'nombre', alias: ['surface_capteurs_m2'] },
    { k: 'volume_balloon', l: 'Capacité totale de stockage solaire', u: 'L', type: 'nombre', alias: ['volume_balloon_l', 'volume_balllon_l', 'volume_l', 'volume_total_l'] },
    { k: 'productivite', l: 'Productivité des capteurs solaires', u: 'W/m²', type: 'nombre', alias: ['productivite_capteurs_w_m2', 'productivite_w_m2'] },
    { k: 'certification', l: 'Certification des capteurs solaires', type: 'texte', alias: ['certification_capteurs', 'certif'] },
    { k: 'emetteurs', l: 'Émetteurs de chauffage central basse température', type: 'choix', options: ['Oui', 'Non'] },
    { k: 'capteurs_hybrides', l: 'Capteurs hybrides photovoltaïques-thermiques', type: 'choix', options: ['Oui', 'Non'] },
  ],
}

/** Repli si un produit du catalogue n'a pas de `fiche_cee` renseignée. */
export const FICHE_PAR_CATEGORIE: Record<string, string> = {
  pac_air_eau: 'BAR-TH-171',
  pac_air_air: 'BAR-TH-129',
  pac_geothermie: 'BAR-TH-172',
  ballon_thermodynamique: 'BAR-TH-148',
  solaire_thermique: 'BAR-TH-168',
  ssc: 'BAR-TH-143',
  combles: 'BAR-EN-101',
  combles_perdus: 'BAR-EN-101',
  combles_rampants: 'BAR-EN-101',
  rampants: 'BAR-EN-101',
  ite: 'BAR-EN-102',
  murs: 'BAR-EN-102',
  plancher: 'BAR-EN-103',
  menuiseries: 'BAR-EN-104',
  // Les portes d’entrée (Ud) et les volets roulants ne relèvent pas de BAR-EN-104.
  // La fiche ne concerne que le remplacement des fenêtres/portes-fenêtres éligibles.
  vmc: 'BAR-TH-127',
}

/**
 * Catégories éligibles à MaPrimeRénov' « par geste » depuis le 01/09/2026 (parmi celles du catalogue).
 * Isolation, menuiseries, VMC, chauffe-eau thermodynamique / solaire n'y sont plus (CEE seulement).
 */
export const CATEGORIES_MPR_PAR_GESTE = ['pac_air_eau', 'pac_geothermie']

/**
 * true  : une aide MaPrimeRénov' sur une catégorie hors parcours par geste (ex. isolation) BLOQUE le devis.
 * false : simple information (barèmes internes Reno Soluces conservés, à confirmer auprès de l'Anah / France Rénov').
 */
export const MPR_GESTE_STRICT = false

/** Opérations ouvrant droit à la bonification « Coup de pouce » (arrêté du 17/08/2026). */
const FICHES_BONIFICATION = ['BAR-TH-148', 'BAR-TH-101', 'BAR-TH-143', 'BAR-TH-162', 'BAR-TH-168']

/* ---------------------------------------------------------------- utils */

export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const rempli = (v: unknown) => {
  if (v === undefined || v === null) return false
  const s = String(v).trim()
  return s !== '' && !/^(null|undefined|n\/a|na)$/i.test(s)
}

const nombre = (v: unknown): number | null => {
  const m = String(v ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

const affiche = (v: string, u: string) => (/[^\d.,\s-]/.test(v) ? v : `${v} ${u}`).trim()

const fmt = (n: number) => String(n).replace('.', ',')

export function extraireFiche(code: string | null | undefined): string | null {
  const m = String(code || '').toUpperCase().match(/(BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-\d{3}/)
  return m ? m[0] : null
}

/** Produits qui ne relèvent pas de BAR-EN-104 : ne pas leur imposer les champs Uw/Sw. */
export function estHorsChampBarEn104(p: ProduitMin | undefined | null): boolean {
  if (!p) return false
  const nom = norm(p.nom)
  const typeMenuiserie = norm(p.caracteristiques?.type_menuiserie)
  if (p.categorie === 'menuiseries' && typeMenuiserie === 'accessoire') return true
  // BAR-EN-104 accepte explicitement les baies fixes. Les portes d'entrée,
  // elles, restent hors périmètre même si leur Ud est renseigné : Ud ne remplace pas Uw/Sw.
  const porteFenetre = /porte.?fenetre|fenetre.?porte/.test(nom) || /porte.?fenetre|fenetre.?porte/.test(typeMenuiserie)
  const porteEntree = /porte d entree|porte entree/.test(nom) || /porte_entree|porte entree/.test(typeMenuiserie)
  return (p.categorie === 'menuiseries_portes' && !porteFenetre)
    || (porteEntree && !porteFenetre)
    || /volet roulant|bubendorff/.test(nom)
}

/**
 * Postes de prestation/fourniture annexes (échafaudage, enduit de façade, consommables…) :
 * ce ne sont pas des équipements d'une fiche CEE. Pas de contrôle R / marque / référence / pose.
 */
export function estPrestationSansFiche(p: ProduitMin | undefined | null): boolean {
  if (!p) return false
  const car = p.caracteristiques || {}
  const prestationIte = norm(car.prestation_ite)
  if (['echafaudage', 'enduit'].includes(prestationIte)) return true
  if (['consommable', 'consommables', 'prestation'].includes(norm(car.type_element ?? car.type ?? car.nature))) return true
  if (/^fac_(echafaudage|enduit)/i.test(String(p.reference || ''))) return true
  const nom = norm(p.nom)
  return /^(echafaudage|enduit de facade|consommables?\b)/.test(nom) || /\bconsommables?\b/.test(norm(p.categorie))
}

export function ficheDuProduit(p: ProduitMin | undefined | null): string | null {
  if (!p) return null
  // Les exclusions de périmètre priment sur une ancienne fiche mal affectée en base.
  if (estHorsChampBarEn104(p)) return null
  if (estPrestationSansFiche(p)) return null
  const f = extraireFiche(p.fiche_cee)
  if (f) return f
  if (!p.eligible_cee || !p.categorie) return null
  return FICHE_PAR_CATEGORIE[p.categorie] || null
}

/* ---- lecture / écriture des valeurs de fiche dans `caracteristiques` ---- */

type Carac = Record<string, any> | null | undefined

/** Cherche la valeur d'un champ dans `caracteristiques` (par libellé, par clé technique, ou libellé normalisé). */
export function lireChamp(car: Carac, champ: ChampFiche): string {
  if (!car) return ''
  if (rempli(car[champ.l])) return String(car[champ.l])
  if (rempli(car[champ.k])) return String(car[champ.k])
  for (const a of champ.alias || []) if (rempli(car[a])) return String(car[a])
  const cible = norm(champ.l)
  for (const [k, v] of Object.entries(car)) if (norm(k) === cible && rempli(v)) return String(v)
  return ''
}

/** Retourne un nouvel objet `caracteristiques` avec la valeur du champ mise à jour (clé = libellé). */
export function ecrireChamp(car: Carac, champ: ChampFiche, valeur: string): Record<string, any> {
  const out: Record<string, any> = {}
  const cible = norm(champ.l)
  for (const [k, v] of Object.entries(car || {})) {
    if (k === champ.l || k === champ.k || (champ.alias || []).includes(k) || norm(k) === cible) continue
    out[k] = v
  }
  if (rempli(valeur)) out[champ.l] = valeur
  return out
}

export function estChampDeFiche(fiche: string | null, cle: string): boolean {
  if (!fiche) return false
  const n = norm(cle)
  return (CHAMPS_FICHE[fiche] || []).some(c => norm(c.l) === n || c.k === cle || (c.alias || []).includes(cle))
}

export function valeursFiche(fiche: string, car: Carac): Record<string, string> {
  const v: Record<string, string> = {}
  for (const c of CHAMPS_FICHE[fiche] || []) v[c.k] = lireChamp(car, c)
  // Codes techniques du catalogue fenêtres (type_menuiserie) → libellés de la fiche.
  if (fiche === 'BAR-EN-104' && rempli(v.typef)) {
    const t = norm(v.typef).replace(/[_-]/g, ' ')
    if (/toit/.test(t)) v.typef = 'Fenêtre de toiture'
    else if (/double/.test(t)) v.typef = 'Double fenêtre'
    else if (/fenetre/.test(t)) v.typef = 'Fenêtre ou porte-fenêtre'
  }
  return v
}

/** Clés techniques ajoutées automatiquement sur les lignes d'isolation : redondantes avec les champs de fiche. */
export const CLES_AUTO_ISOLATION = ['marque_isolant', 'surface_isolee']

/**
 * Valeurs d'une ligne de devis pour sa fiche : caractéristiques saisies, complétées par ce qui se déduit
 * (partie isolée d'après la catégorie, R lu dans la description, surface = quantité).
 */
export function valeursLigne(
  fiche: string,
  car: Carac,
  ctx: { categorie?: string | null; description?: string | null; quantite?: number | null } = {},
): Record<string, string> {
  const v = valeursFiche(fiche, car)
  if (fiche === 'BAR-EN-101') {
    if (!rempli(v.zone)) {
      if (ctx.categorie === 'rampants' || ctx.categorie === 'combles_rampants') v.zone = 'Rampant de toiture'
      else if (ctx.categorie === 'combles_perdus' || ctx.categorie === 'combles') v.zone = 'Comble perdu'
    }
  }
  if (!rempli(v.r) && ['BAR-EN-101', 'BAR-EN-102', 'BAR-EN-103'].includes(fiche)) {
    const m = String(ctx.description || '').match(/\bR\s*(?:≥|>=|=|:)\s*(\d+(?:[.,]\d+)?)/i)
    if (m) v.r = m[1]
  }
  if (fiche === 'BAR-EN-104' && !rempli(v.surface) && ctx.quantite) v.surface = String(ctx.quantite)
  return v
}

/** Lignes « Libellé : valeur » des champs de fiche renseignés (pour l'aperçu et les documents). */
export function libellesFiche(
  fiche: string | null,
  car: Carac,
  ctx: { categorie?: string | null; description?: string | null; quantite?: number | null } = {},
): string[] {
  if (!fiche || !CHAMPS_FICHE[fiche]) return []
  const v = valeursLigne(fiche, car, ctx)
  return CHAMPS_FICHE[fiche].filter(c => c.type !== 'case' && rempli(v[c.k])).map(c => `${c.l} : ${v[c.k]}${c.u && !/[^\d.,\s-]/.test(v[c.k]) ? ' ' + c.u : ''}`)
}

/* ------------------------------------------------ contrôle d'une fiche */

export interface PointFiche { gravite: Gravite; message: string; champ?: string }

/**
 * Contrôle les caractéristiques d'un équipement par rapport à sa fiche.
 * @param surLigne true = contrôle d'une ligne de devis (exige aussi les justificatifs propres au devis)
 */
export function verifierFiche(fiche: string | null, v: Record<string, string>, surLigne: boolean): PointFiche[] {
  const o: PointFiche[] = []
  if (!fiche) return o
  const R = REGLES_FICHES[fiche]
  if (!R || !R.verifiee) {
    o.push({ gravite: 'info', message: `Fiche ${fiche} : règles non intégrées à l’outil, à contrôler sur le texte officiel.` })
    return o
  }
  const bloc = (message: string, champ?: string) => o.push({ gravite: 'bloc', message, champ })
  const champs = CHAMPS_FICHE[fiche] || []
  const lab = (k: string) => champs.find(c => c.k === k)?.l || k
  const besoin = (k: string, l = lab(k)) => {
    if (!rempli(v[k])) { bloc(`${l} à renseigner`, k); return false }
    return true
  }
  const min = (k: string, m: number, u = '') => {
    if (!besoin(k)) return
    const n = nombre(v[k])
    if (n === null || n < m) bloc(`${lab(k)} : ${affiche(v[k], u)}, la fiche exige au moins ${fmt(m)} ${u}`.trim(), k)
  }
  const max = (k: string, m: number, u = '') => {
    if (!besoin(k)) return
    const n = nombre(v[k])
    if (n === null || n > m) bloc(`${lab(k)} : ${affiche(v[k], u)}, la fiche exige au plus ${fmt(m)} ${u}`.trim(), k)
  }
  const classeOk = (c: string) => ['A+++', 'A++', 'A+', 'A', 'B', 'C'].includes(c.toUpperCase().trim())

  switch (fiche) {
    case 'BAR-TH-171': {
      besoin('usage')
      if (besoin('temp')) {
        const t = norm(v.temp)
        min('etas', t.includes('basse') && !t.includes('moy') ? 126 : 111, '%')
      }
      if (besoin('regulateur')) {
        // Accepte « VI », « classe VI », « VI (à confirmer…) » : on extrait le chiffre romain.
        const m = v.regulateur.toUpperCase().match(/\b(VIII|VII|VI|IV|V|III|II|I)\b/)
        if (!m || !['IV', 'V', 'VI', 'VII', 'VIII'].includes(m[1])) bloc('Régulateur de classe IV à VIII exigé', 'regulateur')
      }
      if (surLigne && !/oui|true/i.test(v.note || '')) bloc('Note de dimensionnement à joindre', 'note')
      break
    }
    case 'BAR-TH-172': {
      besoin('usage')
      if (besoin('temp')) {
        const t = norm(v.temp)
        min('etas', t.includes('basse') && !t.includes('moy') ? 126 : 111, '%')
      }
      if (besoin('captage')) {
        const captage = norm(v.captage)
        if (!captage.includes('nappe') && !captage.includes('glycole')) bloc('Type de captage eau de nappe ou eau glycolée à préciser', 'captage')
      }
      if (besoin('regulateur')) {
        const m = v.regulateur.toUpperCase().match(/\\b(VIII|VII|VI|IV|V|III|II|I)\\b/)
        if (!m || !['IV', 'V', 'VI', 'VII', 'VIII'].includes(m[1])) bloc('Régulateur de classe IV à VIII exigé', 'regulateur')
      }
      if (surLigne && !/oui|true/i.test(v.note || '')) bloc('Note de dimensionnement à joindre et respecter', 'note')
      if (norm(v.usage).includes('eau chaude') && rempli(v.systeme_ecs_marque_identique) && /non/i.test(norm(v.systeme_ecs_marque_identique))) {
        bloc('Le système ECS déporté doit être de la même marque que la PAC', 'systeme_ecs_marque_identique')
      }
      break
    }
    case 'BAR-TH-129':
      max('puissance', 12, 'kW')
      min('scop', 3.9)
      break
    case 'BAR-TH-148':
      if (besoin('profil')) {
        const m = ({ M: 95, L: 100, XL: 110 } as Record<string, number>)[v.profil.toUpperCase()]
        if (!m) bloc('Profil M, L ou XL exigé', 'profil')
        else min('efficacite', m, '%')
      }
      break
    case 'BAR-TH-101': {
      min('surface', 2, 'm²')
      if (besoin('certif') && !/cstb|keymark|equiv/i.test(norm(v.certif)))
        bloc('Certification CSTBat, Solar Keymark ou équivalente exigée', 'certif')
      if (besoin('ballon') && (nombre(v.ballon) ?? 0) <= 500 && besoin('classe') && !classeOk(v.classe))
        bloc('Ballon de classe C minimum', 'classe')
      if (besoin('profil') && besoin('appoint') && besoin('efficacite')) {
        const joule = /joule|elec/i.test(norm(v.appoint))
        const tab: Record<string, number> = joule ? { M: 36, L: 37, XL: 38, XXL: 60 } : { M: 95, L: 100, XL: 110, XXL: 120 }
        const m = tab[v.profil.toUpperCase()]
        if (m && (nombre(v.efficacite) ?? 0) < m) bloc(`Efficacité ${v.efficacite} %, au moins ${m} % pour ce profil`, 'efficacite')
      }
      if (/oui|thermo|auto/i.test(norm(v.thermosiphon))) bloc('Thermosiphon et auto-stockeur exclus', 'thermosiphon')
      if (surLigne && !/oui|true/i.test(v.couvre || '')) bloc('Le chauffe-eau doit couvrir la totalité du besoin en ECS', 'couvre')
      break
    }
    case 'BAR-TH-168': {
      if (besoin('usage')) {
        const ch = /chauff/i.test(v.usage)
        min('surface', ch ? 8 : 2, 'm²')
        if (ch && besoin('ballon') && !((nombre(v.ballon) ?? 0) > 400)) bloc('Ballon strictement supérieur à 400 L pour chauffage + ECS', 'ballon')
      }
      min('puiss_m2', 450, 'W/m²')
      if (besoin('certif') && !/qb|keymark|equiv/i.test(norm(v.certif))) bloc('Certification QB ou Solar Keymark exigée', 'certif')
      if (rempli(v.ballon) && (nombre(v.ballon) ?? 0) <= 500 && besoin('classe') && !classeOk(v.classe)) bloc('Ballon de classe C minimum', 'classe')
      break
    }
    case 'BAR-EN-101':
      if (besoin('zone')) min('r', /rampant/i.test(v.zone) ? 6 : 7, 'm².K/W')
      break
    case 'BAR-EN-102':
      min('r', 3.7, 'm².K/W')
      break
    case 'BAR-EN-103':
      min('r', 3, 'm².K/W')
      besoin('parevapeur', 'Pare-vapeur (oui/non)')
      break
    case 'BAR-EN-104': {
      besoin('typef')
      if (rempli(v.uw) && rempli(v.sw)) {
        const uw = nombre(v.uw) ?? 99, sw = nombre(v.sw) ?? -1, t = norm(v.typef)
        let ok: boolean
        if (t.includes('toit')) ok = uw <= 1.5 && sw <= 0.36
        else if (t.includes('double')) ok = uw <= 1.8 && sw >= 0.32
        else ok = (uw <= 1.3 && sw >= 0.3) || (uw <= 1.7 && sw >= 0.36)
        if (!ok) bloc(`Uw ${v.uw} / Sw ${v.sw} hors critères de la fiche pour ce type`, 'uw')
      } else { besoin('uw'); besoin('sw') }
      if (surLigne) besoin('surface')
      break
    }
    case 'BAR-TH-143': {
      besoin('type_ssc')
      min('surface_capteurs', 8, 'm²')
      if (besoin('volume_balloon') && (nombre(v.volume_balloon) ?? 0) <= 400) bloc('Capacité totale de stockage strictement supérieure à 400 L exigée', 'volume_balloon')
      min('productivite', 600, 'W/m²')
      if (besoin('certification') && !/cstbat|solar.?keymark|equivalent|équivalent/i.test(norm(v.certification))) {
        bloc('Certification CSTBat, Solar Keymark ou équivalente à justifier', 'certification')
      }
      if (besoin('emetteurs') && !/oui/i.test(norm(v.emetteurs))) bloc('Émetteurs de chauffage central basse température exigés', 'emetteurs')
      if (besoin('capteurs_hybrides') && /oui/i.test(norm(v.capteurs_hybrides))) bloc('Les capteurs hybrides photovoltaïques-thermiques sont exclus de BAR-TH-143', 'capteurs_hybrides')
      break
    }
    case 'BAR-TH-127':
      if (!/oui/i.test(norm(v.avis))) bloc('Avis technique CCFAT valide exigé', 'avis')
      if (besoin('kind') && !['A', 'B'].includes(v.kind.toUpperCase())) bloc('Type A ou B exigé', 'kind')
      break
  }
  return o
}

/** Contrôle des caractéristiques d'une ligne de devis. */
export function verifierLigne(produit: ProduitMin | undefined | null, ligne: LigneMin): PointFiche[] {
  const fiche = ficheDuProduit(produit)
  if (!fiche) return []
  return verifierFiche(fiche, valeursLigne(fiche, ligne.caracteristiques, { categorie: produit?.categorie, description: ligne.description, quantite: ligne.quantite }), true)
}

/* ---------------------------------------------- contrôle du devis complet */

export const PLAFOND_CUMUL_AIDES: Record<Exclude<CategorieRevenus, null>, number | null> = {
  tres_modestes: 0.9, modestes: 0.75, intermediaires: 0.6, superieurs: null,
}

export function controlerDevis(ctx: ContexteConformite): PointConformite[] {
  const out: PointConformite[] = []
  const add = (groupe: string, gravite: Gravite, message: string, extra: Partial<PointConformite> = {}) =>
    out.push({ groupe, gravite, message, ...extra })

  const { meta, lignes, aides } = ctx
  const L = meta.logement
  const aujourdhui = ctx.aujourdhui || new Date().toISOString().slice(0, 10)
  const annee = parseInt(aujourdhui.slice(0, 4), 10)
  const parId = new Map(ctx.produits.map(p => [p.id, p]))

  const lignesProduit = lignes
    .map((l, i) => ({ l, i, p: l.produit_id ? parId.get(l.produit_id) : undefined }))
    .filter(x => x.p)
  const lignesFiche = lignesProduit
    .map(x => ({ ...x, fiche: ficheDuProduit(x.p) }))
    .filter((x): x is typeof x & { fiche: string } => !!x.fiche)
  const lignesCEE = lignesFiche.filter(x => REGLES_FICHES[x.fiche])
  const aCEE = lignesCEE.length > 0

  const montantCEE = aides.filter(a => a.type === 'cee').reduce((s, a) => s + (a.montant || 0), 0)
  const montantMPR = aides.filter(a => a.type === 'maprimerenov').reduce((s, a) => s + (a.montant || 0), 0)
  const aMPR = montantMPR > 0
  const age = rempli(L.annee) ? annee - (nombre(L.annee) ?? annee) : null

  // Société
  if (!rempli(ctx.societe.siret)) add('Société', 'bloc', 'SIRET non renseigné dans les paramètres de la société')
  if (!rempli(meta.pro.assurance)) add('Société', 'bloc', 'Assurance décennale non renseignée (assureur, contrat, couverture)', { champ: 'pro.assurance' })

  // Qualification RGE
  if (aCEE || aMPR) {
    if (!rempli(meta.pro.rge) || !rempli(meta.pro.organisme)) add('Qualification', 'bloc', 'Numéro et organisme de qualification RGE à renseigner', { champ: 'pro.rge' })
    else if (!rempli(meta.pro.validite)) add('Qualification', 'bloc', 'Date de fin de validité de la qualification RGE à renseigner', { champ: 'pro.validite' })
    else if (meta.pro.validite < (ctx.devis.dateDevis || aujourdhui)) add('Qualification', 'bloc', 'La qualification RGE est expirée à la date du devis', { champ: 'pro.validite' })
    for (const f of new Set(lignesCEE.map(x => x.fiche)))
      if (!meta.pro.couvre[f]) add('Qualification', 'bloc', `Confirmer que la qualification couvre ${f} : ${REGLES_FICHES[f].qualif}`, { champ: `pro.couvre.${f}` })
  }

  // Client
  if (!rempli(ctx.client.nom) || !rempli(ctx.client.adresse)) add('Client', 'bloc', 'Nom et adresse du client obligatoires (fiche prospect)')

  // Logement
  if (aCEE) {
    if (!rempli(L.annee)) add('Logement', 'bloc', 'Année de construction à renseigner (logement de plus de 2 ans)', { champ: 'logement.annee' })
    else if (age !== null && age < 3) add('Logement', 'bloc', `Logement construit en ${L.annee} : il doit exister depuis plus de 2 ans à la date d’engagement`, { champ: 'logement.annee' })
    if (!rempli(L.zone)) add('Logement', 'bloc', 'Zone climatique (H1, H2 ou H3) à renseigner', { champ: 'logement.zone' })
    for (const x of lignesCEE) {
      const R = REGLES_FICHES[x.fiche]
      if (R.maisonSeulement && L.type !== 'Maison individuelle') add('Logement', 'bloc', `${x.fiche} : réservé aux maisons individuelles`, { champ: 'logement.type' })
      if (['BAR-TH-171', 'BAR-TH-129', 'BAR-TH-127'].includes(x.fiche) && !rempli(L.surface)) add('Logement', 'bloc', `${x.fiche} : surface chauffée ou habitable à renseigner`, { champ: 'logement.surface' })
      if (R.residencePrincipale && !L.residencePrincipale) add('Logement', 'bloc', `${x.fiche} : le logement doit être la résidence principale`, { champ: 'logement.residencePrincipale' })
    }
  }

  // Lignes
  lignes.forEach((l, i) => {
    const p = l.produit_id ? parId.get(l.produit_id) : undefined
    if (!p) return
    const fiche = ficheDuProduit(p)
    const nom = `Ligne ${i + 1} · ${l.designation || p.nom}`
    const car = l.caracteristiques || {}
    if (fiche) {
      if (!rempli(car['Marque']) && !rempli(car['marque'])) add(nom, 'bloc', 'Marque de l’équipement à renseigner (obligatoire sur le devis)', { champ: 'marque', ligneId: l.id })
      if (!rempli(car['Référence']) && !rempli(car['reference'])) add(nom, 'bloc', 'Référence de l’équipement à renseigner (obligatoire sur le devis)', { champ: 'reference', ligneId: l.id })
    }
    if (!(l.prix_unitaire_ht && l.prix_unitaire_ht > 0)) add(nom, 'bloc', 'Prix unitaire HT à renseigner', { ligneId: l.id })
    if (fiche) {
      for (const pt of verifierLigne(p, l))
        add(nom, pt.gravite, pt.message, { champ: pt.champ, ligneId: l.id })
      if (['BAR-EN-101', 'BAR-EN-102', 'BAR-EN-103'].includes(fiche)) {
        if (!rempli(meta.dates.visite))
          add(nom, 'bloc', 'Date de la visite préalable à renseigner', { champ: 'dates.visite', ligneId: l.id })
        else if (ctx.devis.dateSignature && meta.dates.visite.slice(0, 10) > ctx.devis.dateSignature.slice(0, 10))
          add(nom, 'bloc', 'La visite préalable doit avoir lieu avant la signature du devis (date d’engagement)', { champ: 'dates.visite', ligneId: l.id })
      }
      if (FICHES_BONIFICATION.includes(fiche)) {
        if (L.fossileConserve) add(nom, 'info', 'Équipement d’eau chaude fossile conservé : la bonification de l’arrêté du 17/08/2026 ne s’applique pas', { ligneId: l.id })
        const engagement = ctx.devis.dateSignature || aujourdhui
        if (engagement < '2026-09-01' || engagement > '2026-12-31')
          add(nom, 'info', 'Engagement hors de la période 01/09–31/12/2026 : pas de bonification', { ligneId: l.id })
      }
    }
  })

  // Cumul
  const fiches = lignesFiche.map(x => x.fiche)
  const vus = new Set<string>()
  for (const f of fiches) for (const c of REGLES_FICHES[f]?.cumul || []) {
    const cle = [f, c].sort().join('|')
    if (fiches.includes(c) && !vus.has(cle)) { vus.add(cle); add('Cumul', 'bloc', `${f} et ${c} ne sont pas cumulables sur un même dossier`) }
  }
  // Fiches sans règles intégrées (BAT-*, BAR-TH-172…) : on le signale une fois
  for (const f of new Set(lignesFiche.filter(x => !REGLES_FICHES[x.fiche]).map(x => x.fiche)))
    add('Fiches', 'info', `Fiche ${f} : règles non intégrées à l’outil, à contrôler sur le texte officiel.`)

  // Dates
  if (aCEE || aMPR) {
    const engagement = ctx.devis.dateSignature ? ctx.devis.dateSignature.slice(0, 10) : aujourdhui
    if (rempli(meta.dates.debut) && meta.dates.debut < engagement)
      add('Dates', 'bloc', 'Les travaux ne peuvent pas commencer avant la signature du devis : la prime est demandée avant le début des travaux', { champ: 'dates.debut' })
    if (montantCEE > 0 && !rempli(meta.oblige)) add('Aides', 'bloc', 'Nom de l’obligé ou du délégataire CEE à renseigner si une prime est déduite', { champ: 'oblige' })
  }

  // MaPrimeRénov'
  if (aMPR) {
    const eligibles = lignesProduit.filter(x => x.p!.categorie && CATEGORIES_MPR_PAR_GESTE.includes(x.p!.categorie))
    if (!eligibles.length)
      add('MaPrimeRénov’', MPR_GESTE_STRICT ? 'bloc' : 'info', 'Aucune ligne éligible au parcours par geste depuis le 01/09/2026 (PAC de chauffage, raccordement réseau, dépose de cuve fioul, audit)' + (MPR_GESTE_STRICT ? '' : ' : barème interne Reno Soluces appliqué, à confirmer auprès de l’Anah / France Rénov’'))
    for (const x of lignesProduit) {
      if (x.p!.categorie && CATEGORIES_MPR_PAR_GESTE.includes(x.p!.categorie)) continue
      if (ficheDuProduit(x.p) || x.p!.eligible_mpr)
        add('MaPrimeRénov’', 'info', `${x.p!.nom} : hors parcours par geste depuis le 01/09/2026 (possible seulement dans une rénovation d’ampleur). Prime CEE possible.`)
    }
    if (ctx.categorieRevenus === 'superieurs') add('MaPrimeRénov’', 'bloc', 'Ménages aux revenus supérieurs : pas de MaPrimeRénov’ pour une pompe à chaleur (CEE possibles)')
    if (ctx.categorieRevenus === null) add('MaPrimeRénov’', 'bloc', 'Catégorie de revenus inconnue : renseigner le RFR et la composition du foyer sur la fiche prospect')
    if (!['Propriétaire occupant', 'Propriétaire bailleur'].includes(meta.statutDemandeur)) add('MaPrimeRénov’', 'bloc', 'Le demandeur doit être propriétaire ou usufruitier', { champ: 'statutDemandeur' })
    if (age !== null && age < 15) add('MaPrimeRénov’', 'bloc', 'Logement construit il y a moins de 15 ans', { champ: 'logement.annee' })
    if (!L.residencePrincipale && meta.statutDemandeur === 'Propriétaire occupant') add('MaPrimeRénov’', 'bloc', 'Résidence principale occupée au moins 8 mois par an exigée', { champ: 'logement.residencePrincipale' })
    const plafond = ctx.categorieRevenus ? PLAFOND_CUMUL_AIDES[ctx.categorieRevenus] : null
    if (plafond && montantCEE + montantMPR > plafond * ctx.totalTTC)
      add('MaPrimeRénov’', 'bloc', `CEE + MaPrimeRénov’ = ${euroCourt(montantCEE + montantMPR)}, au-delà du plafond de ${Math.round(plafond * 100)} % du TTC (${euroCourt(plafond * ctx.totalTTC)})`)
  }

  // Mentions légales
  if (!rempli(ctx.devis.dateValidite)) add('Mentions', 'bloc', 'Date de validité du devis à renseigner (conditions de vente)')
  if (!rempli(meta.dates.debut) || !rempli(meta.dates.duree)) add('Mentions', 'bloc', 'Date de début et durée des travaux à renseigner', { champ: 'dates.debut' })
  if (lignes.length === 0) add('Mentions', 'bloc', 'Aucune ligne sur le devis')

  return out
}

const euroCourt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/* ------------------------------------------------- MaPrimeRénov' helpers */

/** Déduit la catégorie de revenus du libellé du profil MaPrimeRénov' du projet (LABEL_PROFIL[profil]). */
export function categorieRevenusDepuisLabel(label: string | null | undefined): CategorieRevenus {
  const t = norm(label)
  if (!t) return null
  if (t.includes('tres') || t.includes('bleu')) return 'tres_modestes'
  if (t.includes('modeste') || t.includes('jaune')) return 'modestes'
  if (t.includes('intermediaire') || t.includes('violet')) return 'intermediaires'
  if (t.includes('superieur') || t.includes('rose') || t.includes('aise')) return 'superieurs'
  return null
}

export const LABEL_CATEGORIE_REVENUS: Record<Exclude<CategorieRevenus, null>, string> = {
  tres_modestes: 'Très modestes', modestes: 'Modestes', intermediaires: 'Intermédiaires', superieurs: 'Supérieurs',
}

/** Une catégorie de produit peut-elle recevoir une aide MaPrimeRénov' automatique ? */
export function mprParGestePossible(categorie: string | null | undefined, cat: CategorieRevenus): boolean {
  return !!categorie && CATEGORIES_MPR_PAR_GESTE.includes(categorie) && cat !== 'superieurs'
}
