import { determinerProfilMPR, LABEL_PROFIL, type ProfilMPR } from '../aides/baremeMaPrimeRenov'
import { estIleDeFrance } from '../moteurAides'

/** Un avis d'imposition du foyer (un foyer peut en avoir plusieurs : concubins, enfants rattachés…). */
export interface AvisImposition {
  numero_fiscal: string
  reference_avis: string
  rfr: string | number
  date_naissance: string
  nb_personnes: number
}

export const nouvelAvis = (): AvisImposition => ({ numero_fiscal: '', reference_avis: '', rfr: '', date_naissance: '', nb_personnes: 1 })

const nombre = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export interface FoyerAgrege { nbAvis: number; rfrGlobal: number; nbPersonnes: number }

/** Revenu fiscal de référence global et nombre de personnes du foyer = somme des avis renseignés. */
export function agregerAvis(avis: AvisImposition[]): FoyerAgrege {
  // Un avis compte dès qu'il porte un revenu, un numéro fiscal ou une référence (un RFR à 0 reste possible).
  const utiles = avis.filter(a => nombre(a.rfr) > 0 || a.numero_fiscal.trim() !== '' || a.reference_avis.trim() !== '')
  return {
    nbAvis: utiles.length,
    rfrGlobal: Math.round(utiles.reduce((s, a) => s + nombre(a.rfr), 0)),
    nbPersonnes: Math.max(1, Math.round(utiles.reduce((s, a) => s + nombre(a.nb_personnes), 0))),
  }
}

/** Le numéro fiscal et la référence de l'avis comptent 13 caractères. */
export const numeroFiscalValide = (n: string): boolean => /^\d{13}$/.test(n.replace(/\s/g, ''))
export const referenceAvisValide = (n: string): boolean => /^[A-Za-z0-9]{13}$/.test(n.replace(/\s/g, ''))

/** Département déduit du code postal (Corse 2A/2B, outre-mer sur 3 chiffres). */
export function departementDepuisCodePostal(codePostal: string | null | undefined): string {
  const cp = String(codePostal ?? '').replace(/\s/g, '')
  if (!/^\d{5}$/.test(cp)) return ''
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3)
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B'
  return cp.slice(0, 2)
}

export type PrecariteCee = 'Grande précarité' | 'Précarité' | 'Classique'

/** Précarité énergétique CEE : très modeste = grande précarité, modeste = précarité, sinon classique. */
export function precariteDepuisProfil(profil: ProfilMPR): PrecariteCee {
  return profil === 'bleu' ? 'Grande précarité' : profil === 'jaune' ? 'Précarité' : 'Classique'
}

export interface SyntheseFoyer {
  departement: string
  zone: 'Île-de-France' | 'Hors Île-de-France' | ''
  profil: ProfilMPR | null
  couleur: string
  precarite: PrecariteCee | null
}

/** Tout ce que Qhare remplit d'un coup : département, zone, couleur MaPrimeRénov' et précarité. */
export function syntheseFoyer(rfr: number, nbPersonnes: number, codePostal: string | null | undefined): SyntheseFoyer {
  const departement = departementDepuisCodePostal(codePostal)
  const zone = departement ? (estIleDeFrance(codePostal) ? 'Île-de-France' : 'Hors Île-de-France') : ''
  if (!(rfr > 0)) return { departement, zone, profil: null, couleur: '', precarite: null }
  const profil = determinerProfilMPR(rfr, Math.max(1, nbPersonnes), estIleDeFrance(codePostal))
  return { departement, zone, profil, couleur: LABEL_PROFIL[profil], precarite: precariteDepuisProfil(profil) }
}
