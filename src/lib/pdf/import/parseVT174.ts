import type {
  AuditData,
  ChauffageData,
  EcsData,
  MenuiserieFiche,
  MenuiserieMur,
  MurFiche,
  PlafondFiche,
  PlancherFiche,
  VentilationData,
} from '../../../types'

import type { ChampPdf } from './champsPdf'
import {
  VT174_DEFAULTS,
  type VT174ParseResult,
  type VT174Extraction,
} from './typesVT174'

export type { VT174ParseResult } from './typesVT174'

/*
 * Lecture d'un rapport « VT TH174 / 175 SMART » à partir des couples
 * question → réponse reconstitués par champsPdf.ts, puis conversion vers
 * le format des sections de la visite technique RENOVA OS (mêmes valeurs que
 * les listes du wizard, pour que le calcul 3CL / DPE les reconnaisse).
 */

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

function clean(value: string | undefined | null): string {
  return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

function norm(value: string | undefined | null): string {
  return clean(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
}

function nombre(value: string | undefined | null): number | null {
  const m = clean(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

function dimensions(value: string): { largeur: number | null; hauteur: number | null } {
  const m = clean(value).replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)/)
  if (!m) return { largeur: null, hauteur: null }
  return { largeur: Number(m[1]), hauteur: Number(m[2]) }
}

function arrondi(n: number, decimales = 2): number {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

const oui = (v: string) => norm(v).startsWith('oui')

/** « Avant 1948 » → 1947 ; « 1949 - 1974 » → 1962 ; « 1985 » → 1985. */
export function anneeDepuisTexte(value: string): number | null {
  const n = norm(value)
  const annees = (n.match(/\b(1[89]\d{2}|20\d{2})\b/g) || []).map(Number)
  if (!annees.length) return null
  if (n.includes('avant')) return annees[0] - 1
  if (n.includes('apres') || n.includes('depuis')) return annees[0] + 1
  if (annees.length >= 2) return Math.round((annees[0] + annees[1]) / 2)
  return annees[0]
}

function orientationCode(value: string): string {
  const n = norm(value).replace(/[^a-z]/g, '')
  const table: Record<string, string> = {
    nord: 'N', n: 'N', nordest: 'NE', ne: 'NE', est: 'E', e: 'E', sudest: 'SE', se: 'SE',
    sud: 'S', s: 'S', sudouest: 'SO', so: 'SO', ouest: 'O', o: 'O', nordouest: 'NO', no: 'NO',
  }
  return table[n] ?? clean(value)
}

function compositionMur(value: string): string {
  const n = norm(value)
  if (n.includes('parpaing') || n.includes('agglo') || n.includes('bloc beton')) return 'agglomeres'
  if (n.includes('brique')) return n.includes('creuse') ? 'briques_creuses' : n.includes('pleine') ? 'briques_pleines' : 'briques_creuses'
  if (n.includes('beton')) return 'beton'
  if (n.includes('meuliere')) return 'meuliere'
  if (n.includes('pierre') || n.includes('moellon') || n.includes('galet')) return 'pierre'
  if (n.includes('bois') || n.includes('ossature')) return 'bois'
  if (n.includes('metal') || n.includes('bardage')) return 'metal'
  if (n.includes('mixte')) return 'mixte'
  return value ? 'inconnu' : ''
}

function isolantDepuisTexte(value: string): string {
  const n = norm(value)
  if (n.includes('verre')) return 'laine_verre'
  if (n.includes('roche')) return 'laine_roche'
  if (n.includes('polystyrene') || n.includes('pse') || n.includes('xps')) return 'polystyrene'
  if (n.includes('polyurethane') || n.includes('pu ')) return 'polyurethane'
  if (n.includes('ouate')) return 'ouate'
  if (n.includes('chanvre')) return 'chanvre'
  if (n.includes('liege')) return 'liège'
  if (n.includes('bois')) return 'laine_bois'
  return ''
}

/** Isolation déclarée : « Aucune isolation », « Non » → non isolé. */
function estIsole(value: string): boolean | null {
  const n = norm(value)
  if (!n) return null
  if (n.includes('aucune') || n === 'non' || n.startsWith('non ') || n.includes('pas d')) return false
  return true
}

function typeMenuiserie(value: string): string {
  const n = norm(value)
  if (n.includes('porte fenetre') || n.includes('porte-fenetre')) return 'porte_fenetre'
  if (n.includes('baie')) return 'baie_vitree'
  if (n.includes('porte')) return 'porte'
  if (n.includes('velux') || n.includes('fenetre de toit') || n.includes('vasistas')) return 'vasistas'
  if (n.includes('fixe') || n.includes('chassis')) return 'chassis'
  return 'fenetre'
}

function materiauMenuiserie(value: string): string {
  const n = norm(value)
  if (n.includes('pvc')) return 'pvc'
  if (n.includes('alu')) return n.includes('bois') ? 'mixte' : 'aluminium'
  if (n.includes('mixte')) return 'mixte'
  if (n.includes('bois')) return 'bois'
  return ''
}

function vitrageMenuiserie(value: string): string {
  const n = norm(value)
  if (n.includes('triple')) return 'triple'
  if (n.includes('simple')) return 'simple'
  if (n.includes('double')) return n.includes('fe') || n.includes('faible') ? 'double_fe' : 'double'
  return ''
}

function typePlancherBas(value: string): string {
  const n = norm(value)
  if (n.includes('terre')) return 'Terre-plein'
  if (n.includes('vide sanitaire') || n.includes('vs')) return 'Vide sanitaire'
  if (n.includes('sous sol') || n.includes('sous-sol') || n.includes('cave')) return 'Sous-sol'
  if (n.includes('garage') || n.includes('local') || n.includes('non chauffe')) return 'Local non chauffé'
  return clean(value)
}

function typePlancherHaut(value: string): string {
  const n = norm(value)
  if (n.includes('perdu')) return 'Combles perdus'
  if (n.includes('amenage') || n.includes('rampant')) return 'Rampants'
  if (n.includes('terrasse')) return 'Toiture terrasse'
  if (n.includes('grenier')) return 'Plafond sous grenier'
  return clean(value)
}

function energie(value: string): string {
  const n = norm(value)
  if (n.includes('granule') || n.includes('pellet')) return 'Granulés'
  if (n.includes('bois')) return 'Bois'
  if (n.includes('fioul') || n.includes('fuel')) return 'Fioul'
  if (n.includes('gpl') || n.includes('propane') || n.includes('butane')) return 'GPL'
  if (n.includes('gaz')) return 'Gaz'
  if (n.includes('elec')) return 'Electricité'
  if (n.includes('solaire')) return 'Solaire'
  return clean(value)
}

/** Système de chauffage du wizard, déduit de l'énergie, du générateur et des émetteurs. */
function systemeChauffage(energieTxt: string, generateur: string, emetteur: string): string {
  const g = norm(`${generateur} ${emetteur}`)
  const e = energie(energieTxt)
  if (g.includes('pac') || g.includes('pompe a chaleur')) return g.includes('air/air') || g.includes('air air') || g.includes('clim') ? 'PAC Air/Air' : 'PAC Air/Eau'
  if (g.includes('chaudiere')) {
    if (e === 'Fioul' || g.includes('fioul')) return 'Chaudière fioul'
    if (e === 'Bois' || e === 'Granulés' || g.includes('bois') || g.includes('granule')) return 'Chaudière bois'
    return 'Chaudière gaz'
  }
  if (g.includes('granule')) return 'Poêle à granulés'
  if (g.includes('poele') || g.includes('insert') || g.includes('cheminee') || g.includes('foyer')) return e === 'Granulés' ? 'Poêle à granulés' : 'Poêle à bois'
  if (g.includes('radiateur') || g.includes('convecteur') || g.includes('panneau') || g.includes('plancher chauffant') || g.includes('accumulat')) {
    if (e === 'Electricité') return 'Radiateurs électriques'
  }
  if (g.includes('reseau')) return 'Réseau de chaleur'
  switch (e) {
    case 'Electricité': return 'Radiateurs électriques'
    case 'Gaz': return 'Chaudière gaz'
    case 'Fioul': return 'Chaudière fioul'
    case 'Bois': return 'Poêle à bois'
    case 'Granulés': return 'Poêle à granulés'
    case 'GPL': return 'Chaudière gaz'
    default: return ''
  }
}

function systemeEcs(value: string, energieChauffage: string): { systeme: string; energie: string } {
  const n = norm(value)
  if (n.includes('thermodynamique')) return { systeme: 'Ballon thermodynamique', energie: 'Electricité' }
  if (n.includes('solaire')) return { systeme: 'Solaire', energie: 'Solaire' }
  if (n.includes('instantane') || n.includes('chauffe-bain') || n.includes('chauffe bain')) {
    return n.includes('elec') ? { systeme: 'Instantané électrique', energie: 'Electricité' } : { systeme: 'Instantané gaz', energie: 'Gaz' }
  }
  if (n.includes('chaudiere')) return { systeme: 'Chaudière', energie: energie(energieChauffage) }
  if (n.includes('elec') || n.includes('cumulus') || n.includes('ballon') || n.includes('chauffe eau') || n.includes('chauffe-eau')) {
    return { systeme: 'Ballon électrique', energie: 'Electricité' }
  }
  return { systeme: clean(value), energie: '' }
}

function ventilation(value: string): string {
  const n = norm(value)
  if (!n) return ''
  if (n.includes('double')) return 'VMC double flux'
  if (n.includes('hygro')) return n.includes(' b') ? 'VMC simple flux hygroréglable B' : 'VMC simple flux hygroréglable A'
  if (n.includes('vmc') || n.includes('simple flux') || n.includes('auto')) return 'VMC simple flux autoréglable'
  if (n.includes('naturel') || n.includes('grille') || n.includes('entree')) return 'Ventilation naturelle'
  if (n.includes('aucun')) return 'Aucune'
  return clean(value)
}

// ---------------------------------------------------------------------------
// Lecture des champs
// ---------------------------------------------------------------------------

interface MenuiserieBrute {
  porte: boolean
  type: string
  materiau: string
  dimensions: string
  nombre: number
}

interface MurBrut {
  numero: number
  orientation: string
  donnant_sur: string
  surface: number | null
  type: string
  isolation: string
  localisation: string
  isolation_possible: string
  menuiseries: MenuiserieBrute[]
}

interface SystemeChauffageBrut {
  energie: string
  hydraulique: string
  generateur: string
  emetteur: string
  nb_emetteurs: string
  precisions: string
}

interface Lecture {
  ident: Record<string, string>
  planchersBas: { type: string; surface: number | null; hsp: number | null; isolation: string }[]
  planchersHauts: { type: string; surface: number | null; hauteur: number | null; isolation: string; notes: string[] }[]
  murs: MurBrut[]
  chauffages: SystemeChauffageBrut[]
  ecs: { generateur: string; volume: number | null; notes: string[] }[]
  ventilation: string
  observations: string[]
  autres: string[]
}

type Section = 'ident' | 'plancher_bas' | 'plancher_haut' | 'murs' | 'chauffage' | 'ecs' | 'autre'

function lireChamps(champs: ChampPdf[]): Lecture {
  const l: Lecture = {
    ident: {}, planchersBas: [], planchersHauts: [], murs: [], chauffages: [], ecs: [],
    ventilation: '', observations: [], autres: [],
  }
  let section: Section = 'ident'
  let mur: MurBrut | null = null
  // Objet porteur : la menuiserie en cours est modifiée depuis des fonctions internes.
  const etat: { menuiserie: MenuiserieBrute | null } = { menuiserie: null }

  const fermerMenuiserie = () => {
    if (mur && etat.menuiserie && (etat.menuiserie.type || etat.menuiserie.materiau || etat.menuiserie.dimensions)) mur.menuiseries.push(etat.menuiserie)
    etat.menuiserie = null
  }
  const nouvelleMenuiserie = (porte: boolean, type: string) => {
    fermerMenuiserie()
    etat.menuiserie = { porte, type, materiau: '', dimensions: '', nombre: 1 }
  }
  const chauffage = () => {
    if (!l.chauffages.length) l.chauffages.push({ energie: '', hydraulique: '', generateur: '', emetteur: '', nb_emetteurs: '', precisions: '' })
    return l.chauffages[l.chauffages.length - 1]
  }
  const ecs = () => {
    if (!l.ecs.length) l.ecs.push({ generateur: '', volume: null, notes: [] })
    return l.ecs[l.ecs.length - 1]
  }

  for (const champ of champs) {
    const lab = norm(champ.label)
    const val = clean(champ.value)

    // --- Changements de section --------------------------------------------
    if (lab === 'planchers bas') { section = 'plancher_bas'; continue }
    if (lab === 'planchers hauts') { section = 'plancher_haut'; continue }
    if (lab === 'murs et fenetres') { section = 'murs'; continue }
    const numMur = lab.match(/^murs?\s+(\d+)$/)
    if (numMur) {
      fermerMenuiserie()
      section = 'murs'
      mur = { numero: Number(numMur[1]), orientation: '', donnant_sur: '', surface: null, type: '', isolation: '', localisation: '', isolation_possible: '', menuiseries: [] }
      l.murs.push(mur)
      continue
    }
    if (lab.startsWith('chauffage / ecs') || lab.startsWith('chauffage/ecs')) { fermerMenuiserie(); section = 'chauffage'; continue }
    if (/^systeme de chauffage\b.*\b\d+$/.test(lab)) {
      section = 'chauffage'
      l.chauffages.push({ energie: '', hydraulique: '', generateur: '', emetteur: '', nb_emetteurs: '', precisions: '' })
      continue
    }
    if (/^systeme (d')?ecs\b.*\b\d+$/.test(lab)) { section = 'ecs'; l.ecs.push({ generateur: '', volume: null, notes: [] }); continue }
    if (lab.startsWith('systeme ecs') || lab.startsWith("systeme d'ecs")) { section = 'ecs'; continue }
    if (lab.startsWith('details supplementaires') || lab.startsWith('photos supplementaires') || lab.startsWith('croquis')) { fermerMenuiserie(); section = 'autre' }

    // La ventilation est dans le même chapitre que le chauffage et l'ECS.
    if (lab.startsWith('type de ventilation') || lab === 'ventilation') { l.ventilation = val; continue }
    if (lab === 'observations' && val) { l.observations.push(val); continue }
    if (!val) continue

    switch (section) {
      case 'ident': {
        const cle =
          lab.startsWith('nom du proprietaire') ? 'nom_proprietaire'
          : lab.startsWith('prenom du proprietaire') ? 'prenom_proprietaire'
          : lab.startsWith('raison sociale') ? 'raison_sociale'
          : lab.includes('logement est il loue') || lab.includes('logement est-il loue') ? 'loue'
          : lab.startsWith('nom du locataire') ? 'nom_locataire'
          : lab.startsWith('prenom du locataire') ? 'prenom_locataire'
          : lab === 'adresse' || lab.startsWith('adresse du logement') ? 'adresse'
          : lab.startsWith('code postal') ? 'code_postal'
          : lab === 'ville' || lab.startsWith('commune') ? 'ville'
          : lab.startsWith('annee de construction') ? 'annee'
          : lab.startsWith('type de compteur') ? 'compteur'
          : lab.startsWith('type de logement') ? 'type_logement'
          : lab.startsWith('superficie habitable') || lab.startsWith('surface habitable') ? 'surface'
          : lab.startsWith('nombre de niveaux') ? 'niveaux'
          : lab.startsWith('nombre de pieces') ? 'pieces'
          : lab.startsWith('nombre de cuisine') ? 'cuisines'
          : lab.startsWith('nombre de salles de bain') ? 'sdb'
          : lab.startsWith('nombre de wc') ? 'wc'
          : lab.startsWith('telephone') ? 'telephone'
          : lab.startsWith('email') || lab.startsWith('e-mail') ? 'email'
          : lab.startsWith('date') ? 'date'
          : ''
        if (cle) l.ident[cle] = val
        break
      }
      case 'plancher_bas': {
        if (lab.startsWith('types de planchers bas') || lab.startsWith('type de planchers bas') || lab.startsWith('type de plancher bas')) {
          l.planchersBas.push({ type: val, surface: null, hsp: null, isolation: '' })
          break
        }
        const p = l.planchersBas[l.planchersBas.length - 1]
        if (!p) break
        if (lab.startsWith('surface')) p.surface = nombre(val)
        else if (lab.startsWith('hauteur')) p.hsp = nombre(val)
        else if (lab.includes('isole')) p.isolation = val
        break
      }
      case 'plancher_haut': {
        if (/^type (de )?planchers? hauts?/.test(lab)) {
          l.planchersHauts.push({ type: val, surface: null, hauteur: null, isolation: '', notes: [] })
          break
        }
        const p = l.planchersHauts[l.planchersHauts.length - 1]
        if (!p) break
        if (lab.includes('surface')) p.surface = nombre(val)
        else if (lab.startsWith('hauteur')) p.hauteur = nombre(val)
        else if (lab.includes('isole')) p.isolation = val
        else p.notes.push(`${clean(champ.label).replace(/\s*\(.*$/, '')} : ${val}`)
        break
      }
      case 'murs': {
        if (!mur) break
        if (lab.startsWith('orientation')) mur.orientation = val
        else if (lab.startsWith('mur donnant sur')) mur.donnant_sur = val
        else if (lab.startsWith('surface')) mur.surface = nombre(val)
        else if (lab.startsWith('type de mur')) mur.type = val
        else if (lab.startsWith('est ce que le mur est isole') || lab.startsWith('le mur est-il isole') || lab.startsWith('isolation du mur')) mur.isolation = val
        else if (lab.startsWith('localisation')) mur.localisation = val
        else if (lab.startsWith("l'isolation est elle possible")) mur.isolation_possible = val
        else if (lab.startsWith('type de fenetre')) nouvelleMenuiserie(false, val)
        else if (lab.startsWith('type de porte')) nouvelleMenuiserie(true, val)
        else if (lab.startsWith('type de materiau') || lab.startsWith('materiau')) {
          if (!etat.menuiserie) nouvelleMenuiserie(false, '')
          etat.menuiserie!.materiau = val
        } else if (lab.startsWith('dimension')) {
          if (!etat.menuiserie) nouvelleMenuiserie(false, '')
          etat.menuiserie!.dimensions = val
        } else if (lab.startsWith('qte') || lab.startsWith('quantite')) {
          if (etat.menuiserie) { etat.menuiserie.nombre = nombre(val) ?? 1; fermerMenuiserie() }
        }
        break
      }
      case 'chauffage': {
        const c = chauffage()
        if (lab.startsWith("type d'energie") || lab.startsWith('energie')) c.energie = val
        else if (lab.includes('chauffage central hydraulique')) c.hydraulique = val
        else if (lab.startsWith('emetteur')) c.emetteur = val
        else if (lab.startsWith("nombre d'emetteur")) c.nb_emetteurs = val
        else if (lab.startsWith('type de generateur') || lab.startsWith('generateur') || lab.startsWith('type de chaudiere') || lab.startsWith('type de pac')) c.generateur = val
        else if (lab.startsWith('precision')) c.precisions = val
        break
      }
      case 'ecs': {
        const e = ecs()
        if (lab.startsWith('type de generateur') || lab.startsWith('generateur') || lab.startsWith('type de ballon')) e.generateur = val
        else if (lab.startsWith('volume') || lab.startsWith('capacite')) e.volume = nombre(val)
        else if (lab.startsWith('dimensions')) e.notes.push(`Place disponible pour un nouveau ballon : ${val}`)
        else if (lab.startsWith('precision')) e.notes.push(val)
        break
      }
      default:
        if (val && !lab.startsWith('avez vous bien recupere') && !lab.startsWith('resume')) l.autres.push(`${clean(champ.label).replace(/\s*\(.*$/, '')} : ${val}`)
    }
  }
  fermerMenuiserie()
  return l
}

// ---------------------------------------------------------------------------
// Conversion vers les sections RENOVA OS
// ---------------------------------------------------------------------------

/** Hauteur retenue pour convertir une surface de mur en longueur × hauteur (le rapport ne donne que la surface). */
const HAUTEUR_MUR_DEFAUT = 2.5

function versAudit(l: Lecture): { audit: AuditData; avertissements: string[] } {
  const avertissements: string[] = []
  const i = l.ident

  // Identification -----------------------------------------------------------
  const loue = oui(i.loue || '')
  const notesIdent = [
    i.nom_proprietaire || i.prenom_proprietaire ? `Propriétaire : ${[i.nom_proprietaire, i.prenom_proprietaire].filter(Boolean).join(' ')}` : '',
    i.raison_sociale ? `Société propriétaire : ${i.raison_sociale}` : '',
    loue && (i.nom_locataire || i.prenom_locataire) ? `Locataire : ${[i.nom_locataire, i.prenom_locataire].filter(Boolean).join(' ')}` : '',
    i.compteur ? `Compteur électrique : ${i.compteur}` : '',
    i.pieces ? `Pièces à vivre : ${i.pieces}` : '',
    i.cuisines || i.sdb || i.wc ? `Cuisine(s) : ${i.cuisines || '—'}, salle(s) de bains : ${i.sdb || '—'}, WC : ${i.wc || '—'}` : '',
    i.annee && anneeDepuisTexte(i.annee) !== null && !/^\d{4}$/.test(i.annee.trim()) ? `Année de construction déclarée : ${i.annee}` : '',
    ...l.observations.map(o => `Observations : ${o}`),
    ...l.autres,
  ].filter(Boolean)

  const identification: AuditData['identification'] = {
    ...VT174_DEFAULTS.identification,
    date_visite: i.date || '',
    occupation: loue ? 'proprietaire_bailleur' : (i.nom_proprietaire ? 'proprietaire_occupant' : ''),
    nom_occupant: loue ? (i.nom_locataire || '') : (i.nom_proprietaire || ''),
    prenom_occupant: loue ? (i.prenom_locataire || '') : (i.prenom_proprietaire || ''),
    telephone: i.telephone || '',
    email: i.email || '',
    adresse: i.adresse || '',
    code_postal: (i.code_postal || '').replace(/\D/g, '').slice(0, 5),
    ville: i.ville || '',
    notes: notesIdent.join('\n'),
    photos: [],
  }

  // Bâtiment -----------------------------------------------------------------
  const typeLogement = norm(i.type_logement)
  const donnees_batiment: AuditData['donnees_batiment'] = {
    ...VT174_DEFAULTS.donnees_batiment,
    type_batiment: typeLogement.includes('appart') ? 'appartement' : typeLogement.includes('maison') ? 'maison' : typeLogement.includes('immeuble') ? 'immeuble' : '',
    surface_habitable: nombre(i.surface),
    nombre_niveaux: nombre(i.niveaux),
    annee_construction: anneeDepuisTexte(i.annee || ''),
    hsp: HAUTEUR_MUR_DEFAUT,
  }

  // Murs et menuiseries ------------------------------------------------------
  const menuiseries: MenuiserieFiche[] = []
  const murs: MurFiche[] = l.murs.map(m => {
    const id = `import-vt-mur-${m.numero}`
    const isole = estIsole(m.isolation)
    const surface = m.surface ?? 0
    const orientation = orientationCode(m.orientation)
    const menusMur: MenuiserieMur[] = []

    m.menuiseries.forEach((b, index) => {
      const { largeur, hauteur } = dimensions(b.dimensions)
      const type = b.porte ? 'porte' : typeMenuiserie(b.type)
      const vitrage = b.porte ? '' : (vitrageMenuiserie(b.type) || 'double')
      const fiche: MenuiserieFiche = {
        id: `${id}-${b.porte ? 'porte' : 'menuiserie'}-${index + 1}`,
        type_menuiserie: type,
        orientation,
        mur_rattache: id,
        largeur_m: largeur,
        hauteur_m: hauteur,
        vitrage,
        materiau: materiauMenuiserie(`${b.materiau} ${b.type}`),
        nombre: b.nombre || 1,
        notes: [b.type, b.porte ? '' : (vitrageMenuiserie(b.type) ? '' : 'Vitrage non précisé dans le rapport : double vitrage retenu')].filter(Boolean).join(' — '),
        photos: [],
      }
      menuiseries.push(fiche)
      for (let k = 0; k < (b.nombre || 1); k++) {
        menusMur.push({ id: `${fiche.id}-${k + 1}`, type_menuiserie: type, largeur_m: largeur, hauteur_m: hauteur, vitrage, photos: [] })
      }
    })

    return {
      id,
      orientation,
      position: [m.donnant_sur, m.localisation].filter(Boolean).join(' — '),
      type_doublage: '',
      composition: compositionMur(m.type),
      epaisseur_cm: nombre(m.type),
      // Le rapport donne une surface : on la répartit sur une hauteur standard de 2,50 m.
      longueur_m: surface ? arrondi(surface / HAUTEUR_MUR_DEFAUT) : null,
      hauteur_type: 'plat',
      hauteur_m: surface ? HAUTEUR_MUR_DEFAUT : null,
      isole: isole === null ? '' : isole ? 'oui' : 'non',
      isolant_type: isole ? isolantDepuisTexte(m.isolation) : '',
      epaisseur_isolant_cm: isole ? nombre(m.isolation) : null,
      mur_lourd: '',
      paroi_ancienne: '',
      retour_iso_menuiseries: '',
      menuiseries: menusMur,
      notes: [
        m.type ? `Type relevé : ${m.type}` : '',
        surface ? `Surface relevée : ${surface} m²` : '',
        m.donnant_sur ? `Donne sur : ${m.donnant_sur}` : '',
        m.localisation ? `Pièce : ${m.localisation}` : '',
        m.isolation ? `Isolation : ${m.isolation}` : '',
        m.isolation_possible ? `Isolation possible : ${m.isolation_possible}` : '',
      ].filter(Boolean).join('\n'),
      etape_active: 0,
      photos: [],
    }
  })

  // Planchers bas -------------------------------------------------------------
  const planchers: PlancherFiche[] = l.planchersBas.map((p, index) => {
    const isole = estIsole(p.isolation)
    return {
      id: `import-vt-plancher-${index + 1}`,
      type: typePlancherBas(p.type),
      position: '',
      surface_m2: p.surface,
      composition: '',
      isolation: isole ? 'oui' : 'non',
      isolant_type: '',
      epaisseur_isolant_cm: isole ? nombre(p.isolation) : null,
      notes: [p.type ? `Type relevé : ${p.type}` : '', p.isolation ? `Isolation : ${p.isolation}` : ''].filter(Boolean).join('\n'),
      photos: [],
    }
  })

  // Planchers hauts / combles -------------------------------------------------
  const plafonds: PlafondFiche[] = l.planchersHauts.map((p, index) => {
    const isole = estIsole(p.isolation)
    return {
      id: `import-vt-plafond-${index + 1}`,
      type: typePlancherHaut(p.type),
      position: '',
      surface_m2: p.surface,
      composition: '',
      isolation: isole ? 'Oui' : 'Non',
      isolant_type: isole ? isolantDepuisTexte(p.isolation) : '',
      epaisseur_isolant_cm: isole ? nombre(p.isolation) : null,
      notes: [
        p.type ? `Type relevé : ${p.type}` : '',
        p.hauteur !== null ? `Hauteur sous faîtage : ${p.hauteur} m` : '',
        p.isolation ? `Isolation : ${p.isolation}` : '',
        ...p.notes,
      ].filter(Boolean).join('\n'),
      photos: [],
    }
  })

  // Chauffage ------------------------------------------------------------------
  const sys = l.chauffages.filter(c => c.energie || c.emetteur || c.generateur)
  const principal = sys[0]
  const secondaire = sys[1]
  const chauffageData: ChauffageData = {
    ...VT174_DEFAULTS.chauffage,
    systeme_principal: principal ? systemeChauffage(principal.energie, principal.generateur, principal.emetteur) : '',
    energie: principal ? energie(principal.energie.split(/[,;/]/)[0]) : '',
    systeme_secondaire: secondaire ? systemeChauffage(secondaire.energie, secondaire.generateur, secondaire.emetteur) : '',
    notes: sys.map((c, k) => [
      `Système ${k + 1} : ${[c.energie && `énergie ${c.energie}`, c.generateur && `générateur ${c.generateur}`, c.emetteur && `émetteurs ${c.emetteur}${c.nb_emetteurs ? ` (${c.nb_emetteurs})` : ''}`, c.hydraulique && `chauffage central hydraulique : ${c.hydraulique}`].filter(Boolean).join(', ')}`,
      c.precisions,
    ].filter(Boolean).join(' — ')).join('\n'),
  }
  if (principal && norm(principal.emetteur).includes('cheminee')) {
    avertissements.push('Chauffage par cheminée : enregistré comme « Poêle à bois » (pas de choix « cheminée » dans la visite), le rendement réel d’un foyer ouvert est plus faible.')
  }

  // ECS ------------------------------------------------------------------------
  const ballon = l.ecs.find(e => e.generateur) ?? l.ecs[0]
  const ecsMap = ballon ? systemeEcs(ballon.generateur, principal?.energie || '') : { systeme: '', energie: '' }
  const ecsData: EcsData = {
    ...VT174_DEFAULTS.ecs,
    systeme: ecsMap.systeme,
    energie: ecsMap.energie,
    capacite_l: ballon?.volume ?? null,
    notes: [ballon?.generateur ? `Générateur relevé : ${ballon.generateur}` : '', ...(ballon?.notes || [])].filter(Boolean).join('\n'),
  }

  // Ventilation ------------------------------------------------------------------
  const typeVentil = ventilation(l.ventilation)
  const ventilationData: VentilationData = {
    ...VT174_DEFAULTS.ventilation,
    type: typeVentil,
    presence_vmc: typeVentil.startsWith('VMC') ? 'oui' : typeVentil ? 'non' : '',
    notes: l.ventilation ? `Relevé : ${l.ventilation}` : '',
  }

  // Sections réellement renseignées (cochées dans le wizard).
  const completed: number[] = []
  if (identification.adresse || identification.nom_occupant) completed.push(1)
  if (donnees_batiment.surface_habitable) completed.push(2)
  if (murs.length) completed.push(3)
  if (menuiseries.length) completed.push(4)
  if (planchers.length) completed.push(5)
  if (plafonds.length) completed.push(6)
  if (ventilationData.type) completed.push(7)
  if (chauffageData.systeme_principal) completed.push(8)
  if (ecsData.systeme) completed.push(9)

  const audit: AuditData = {
    identification,
    donnees_batiment,
    murs,
    menuiseries,
    planchers,
    plafonds,
    ventilation: ventilationData,
    chauffage: chauffageData,
    ecs: ecsData,
    completed_sections: completed,
  }

  return { audit, avertissements }
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export function parseVT174(champs: ChampPdf[], texte = ''): VT174ParseResult {
  const avertissements: string[] = []
  const erreurs: string[] = []

  const formatDetecte = norm(texte).includes('vt th174') || champs.some(c => norm(c.label).includes('vt th174'))
  const lecture = lireChamps(champs)
  const { audit, avertissements: avConversion } = versAudit(lecture)
  avertissements.push(...avConversion)

  const nbChamps = champs.filter(c => c.value).length
  if (!formatDetecte && (lecture.murs.length === 0 || nbChamps < 10)) {
    erreurs.push('Ce document n’est pas un rapport « VT TH174 / 175 SMART » lisible : aucune donnée de visite n’a été reconnue. La visite n’a pas été créée.')
  } else if (!formatDetecte) {
    avertissements.push('Le titre « VT TH174 / 175 SMART » n’a pas été trouvé : vérifiez attentivement les données reprises.')
  }

  if (!audit.identification?.adresse) avertissements.push('Adresse du logement non trouvée.')
  if (!audit.donnees_batiment?.surface_habitable) avertissements.push('Surface habitable non trouvée : la note du logement ne pourra pas être calculée.')
  if (!audit.donnees_batiment?.annee_construction) avertissements.push('Année de construction non trouvée.')
  if (!audit.murs?.length) avertissements.push('Aucun mur trouvé dans le rapport.')
  if (audit.murs?.some(m => !m.longueur_m)) avertissements.push('Certains murs n’ont pas de surface.')
  if (!audit.planchers?.length) avertissements.push('Aucun plancher bas trouvé.')
  if (!audit.plafonds?.length) avertissements.push('Aucun plancher haut (combles, toiture) trouvé.')
  if (!audit.chauffage?.systeme_principal) avertissements.push('Système de chauffage non reconnu.')
  if (!audit.ecs?.systeme) avertissements.push('Production d’eau chaude non reconnue.')
  if (audit.menuiseries?.some(m => m.type_menuiserie !== 'porte' && m.notes.includes('Vitrage non précisé'))) {
    avertissements.push('Le rapport ne précise pas le type de vitrage : double vitrage retenu pour les fenêtres (à corriger si besoin).')
  }

  const extraction: VT174Extraction = {
    identification: audit.identification ?? {},
    donnees_batiment: audit.donnees_batiment ?? {},
    murs: audit.murs ?? [],
    menuiseries: audit.menuiseries ?? [],
    planchers: audit.planchers ?? [],
    plafonds: audit.plafonds ?? [],
    ventilation: audit.ventilation ?? {},
    chauffage: audit.chauffage ?? {},
    ecs: audit.ecs ?? {},
    photos: [],
    observations: lecture.observations,
    metadata: {
      format: 'VT_TH174_175_SMART',
      source: 'pdf',
      nom_proprietaire: lecture.ident.nom_proprietaire,
      prenom_proprietaire: lecture.ident.prenom_proprietaire,
      nom_locataire: lecture.ident.nom_locataire,
      prenom_locataire: lecture.ident.prenom_locataire,
    },
  }

  return {
    success: erreurs.length === 0,
    format_detecte: formatDetecte,
    audit_data: audit,
    extraction,
    statistiques: {
      champs_detectes: nbChamps,
      murs_detectes: audit.murs?.length ?? 0,
      menuiseries_detectees: (audit.menuiseries ?? []).reduce((s, m) => s + (m.nombre || 1), 0),
      planchers_detectes: audit.planchers?.length ?? 0,
      plafonds_detectes: audit.plafonds?.length ?? 0,
      photos_detectees: 0,
    },
    avertissements,
    erreurs,
  }
}
