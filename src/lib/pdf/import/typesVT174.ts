import type {
  AuditData,
  ChauffageData,
  DonneesBatimentData,
  EcsData,
  IdentificationData,
  MenuiserieFiche,
  MurFiche,
  PlafondFiche,
  PlancherFiche,
  VentilationData,
} from '../../../types'

/**
 * Représente les données extraites du rapport
 * "VT TH174 / 175 SMART".
 *
 * Ce type est volontairement séparé de AuditData :
 * le PDF peut contenir des informations que RENOVA OS
 * ne sait pas encore stocker directement.
 */

export interface VT174Extraction {
  identification: Partial<IdentificationData>

  donnees_batiment: Partial<DonneesBatimentData>

  murs: Partial<MurFiche>[]

  menuiseries: Partial<MenuiserieFiche>[]

  planchers: Partial<PlancherFiche>[]

  plafonds: Partial<PlafondFiche>[]

  ventilation: Partial<VentilationData>

  chauffage: Partial<ChauffageData>

  ecs: Partial<EcsData>

  photos: string[]

  observations: string[]

  metadata: {
    format: 'VT_TH174_175_SMART'
    source: 'pdf'
    nom_proprietaire?: string
    prenom_proprietaire?: string
    nom_locataire?: string
    prenom_locataire?: string
    rapport_statut?: string
  }
}

/**
 * Résultat du parsing.
 *
 * On conserve également les informations de contrôle
 * pour pouvoir afficher au commercial ce qui a été trouvé
 * et ce qui n'a pas pu être récupéré.
 */
export interface VT174ParseResult {
  success: boolean

  format_detecte: boolean

  audit_data: AuditData

  extraction: VT174Extraction

  statistiques: {
    champs_detectes: number
    murs_detectes: number
    menuiseries_detectees: number
    planchers_detectes: number
    plafonds_detectes: number
    photos_detectees: number
  }

  avertissements: string[]

  erreurs: string[]
}

/**
 * Bloc représentant un mur tel qu'il apparaît
 * dans le rapport PDF.
 */
export interface VT174MurBlock {
  numero: number

  orientation: string

  limite: string

  surface_m2: number | null

  type_mur: string

  isolation: string

  piece: string

  photos: string[]

  isolation_possible: string

  menuiseries: VT174MenuiserieBlock[]

  portes: VT174PorteBlock[]
}

/**
 * Fenêtre / baie vitrée rattachée à un mur.
 */
export interface VT174MenuiserieBlock {
  type: string

  materiau: string

  largeur_m: number | null

  hauteur_m: number | null

  nombre: number

  vitrage?: string

  volets?: string

  photos: string[]
}

/**
 * Porte rattachée à un mur.
 */
export interface VT174PorteBlock {
  type: string

  materiau: string

  largeur_m: number | null

  hauteur_m: number | null

  nombre: number

  photos: string[]
}

/**
 * Valeurs intermédiaires utilisées pendant
 * l'interprétation du rapport.
 */
export interface VT174Context {
  texte: string

  lignes: string[]

  proprietaire?: {
    nom: string
    prenom: string
  }

  locataire?: {
    nom: string
    prenom: string
  }

  adresse?: {
    rue: string
    code_postal: string
    ville: string
  }

  murs: VT174MurBlock[]

  photos: string[]
}

/**
 * Valeurs par défaut utilisées lorsque le rapport
 * ne fournit pas une information.
 *
 * Ces valeurs permettent de construire un AuditData
 * compatible avec les sections actuelles de RENOVA OS.
 */
export const VT174_DEFAULTS = {
  identification: {
    date_visite: '',
    occupation: '',
    nom_occupant: '',
    prenom_occupant: '',
    telephone: '',
    email: '',
    adresse: '',
    code_postal: '',
    ville: '',
    notes: '',
    photos: [],
  } satisfies IdentificationData,

  donnees_batiment: {
    photo_facade: '',
    type_batiment: '',
    mitoyennete: '',
    surface_habitable: null,
    nombre_niveaux: null,
    orientation_principale: '',
    etat_general: '',
    annee_construction: null,
    hsp: null,
    photos_facade: [],
  } satisfies DonneesBatimentData,

  ventilation: {
    type: '',
    presence_vmc: '',
    age_installation: null,
    notes: '',
  } satisfies VentilationData,

  chauffage: {
    systeme_principal: '',
    energie: '',
    puissance_kw: null,
    annee_installation: null,
    systeme_secondaire: '',
    notes: '',
  } satisfies ChauffageData,

  ecs: {
    systeme: '',
    energie: '',
    capacite_l: null,
    annee_installation: null,
    notes: '',
  } satisfies EcsData,
} as const