import { supabase } from '../supabase'
import type { Profile } from '../auth/AuthContext'

/**
 * Tournées de porte-à-porte.
 *
 * Une tournée vit sur l'appareil du commercial (localStorage) : elle fonctionne sans réseau et sans
 * table dédiée. Dès qu'une porte devient « intéressé » ou « rendez-vous », elle est transformée en fiche
 * prospect du CRM (avec historique), ce qui la rend visible de l'équipe.
 */
export type ResultatPorte = 'absent' | 'refus' | 'interesse' | 'rdv'

export const RESULTATS_PORTE: { valeur: ResultatPorte; label: string; court: string; couleur: string; contact: boolean }[] = [
  { valeur: 'absent', label: 'Absent', court: 'Absent', couleur: '#8E8A80', contact: false },
  { valeur: 'refus', label: 'Pas intéressé', court: 'Refus', couleur: '#D62828', contact: true },
  { valeur: 'interesse', label: 'Intéressé', court: 'Intéressé', couleur: '#E8A317', contact: true },
  { valeur: 'rdv', label: 'Rendez-vous pris', court: 'RDV', couleur: '#2D8659', contact: true },
]
export const couleurResultat = (r: ResultatPorte) => RESULTATS_PORTE.find(x => x.valeur === r)?.couleur ?? '#8E8A80'
export const libelleResultat = (r: ResultatPorte) => RESULTATS_PORTE.find(x => x.valeur === r)?.label ?? r

export interface Porte {
  id: string
  lat: number
  lng: number
  adresse: string
  codePostal: string
  ville: string
  resultat: ResultatPorte
  note: string
  prenom: string
  nom: string
  telephone: string
  email: string
  dateRdv: string
  passages: number
  prospectId: string | null
  /** true tant que la fiche prospect n'a pas pu être créée (hors-ligne). */
  aSynchroniser: boolean
  creeLe: string
  majLe: string
}

export interface Tournee { id: string; nom: string; date: string; objectif: number; portes: Porte[] }
export interface StockageTournees { tournees: Tournee[]; courante: string }

const cle = (profilId: string | undefined) => `renova_tournees_v1_${profilId || 'anonyme'}`
const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function nouvelleTournee(): Tournee {
  const date = new Date()
  return { id: nouvelId(), nom: `Tournée du ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`, date: date.toISOString(), objectif: 40, portes: [] }
}

export function lireTournees(profilId: string | undefined): StockageTournees {
  try {
    const brut = localStorage.getItem(cle(profilId))
    if (brut) {
      const s = JSON.parse(brut) as StockageTournees
      if (s.tournees?.length) return s
    }
  } catch { /* stockage indisponible ou corrompu */ }
  const t = nouvelleTournee()
  return { tournees: [t], courante: t.id }
}

export function ecrireTournees(profilId: string | undefined, s: StockageTournees) {
  try { localStorage.setItem(cle(profilId), JSON.stringify(s)) } catch { /* quota plein : la saisie reste en mémoire */ }
}

export function creerPorte(partiel: Partial<Porte> & Pick<Porte, 'lat' | 'lng'>): Porte {
  const maintenant = new Date().toISOString()
  return {
    id: nouvelId(), adresse: '', codePostal: '', ville: '', resultat: 'absent', note: '', prenom: '', nom: '', telephone: '', email: '', dateRdv: '',
    passages: 1, prospectId: null, aSynchroniser: false, creeLe: maintenant, majLe: maintenant, ...partiel,
  }
}

export interface StatsTournee {
  portes: number; contacts: number; interesses: number; rdv: number; absents: number; refus: number
  tauxContact: number | null; tauxRdv: number | null
}
export function statsTournee(t: Tournee): StatsTournee {
  const n = (r: ResultatPorte) => t.portes.filter(p => p.resultat === r).length
  const portes = t.portes.length
  const contacts = n('refus') + n('interesse') + n('rdv')
  return {
    portes, contacts, interesses: n('interesse'), rdv: n('rdv'), absents: n('absent'), refus: n('refus'),
    tauxContact: portes ? Math.round((contacts / portes) * 100) : null,
    tauxRdv: contacts ? Math.round((n('rdv') / contacts) * 100) : null,
  }
}

/* ---------------------------------------------------------------- Base Adresse Nationale */

export interface AdresseBan { label: string; adresse: string; codePostal: string; ville: string; lat: number; lng: number }
const versAdresse = (f: any): AdresseBan => ({
  label: f.properties.label, adresse: f.properties.name, codePostal: f.properties.postcode || '', ville: f.properties.city || '',
  lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
})

export async function chercherAdresses(q: string, proche?: { lat: number; lng: number }): Promise<AdresseBan[]> {
  if (q.trim().length < 3) return []
  try {
    const biais = proche ? `&lat=${proche.lat}&lon=${proche.lng}` : ''
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5${biais}`)
    return ((await r.json()).features || []).map(versAdresse)
  } catch { return [] }
}

export async function adresseDepuisPosition(lat: number, lng: number): Promise<AdresseBan | null> {
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`)
    const f = ((await r.json()).features || [])[0]
    return f ? { ...versAdresse(f), lat, lng } : null
  } catch { return null }
}

/* ---------------------------------------------------------------- Passage au CRM */

/** Crée ou met à jour la fiche prospect d'une porte « intéressé » / « rendez-vous ». Renvoie l'identifiant, ou une erreur. */
export async function synchroniserPorte(porte: Porte, profil: Profile | null): Promise<{ prospectId: string | null; erreur: string | null }> {
  if (porte.resultat !== 'interesse' && porte.resultat !== 'rdv') return { prospectId: porte.prospectId, erreur: null }
  const champs = {
    nom: porte.nom.trim() || 'Contact porte-à-porte', prenom: porte.prenom.trim(), telephone: porte.telephone.trim() || null, email: porte.email.trim() || null,
    adresse: porte.adresse || null, adresse_rue: porte.adresse || null, code_postal: porte.codePostal || null, ville: porte.ville || null,
    notes: porte.note.trim() || null,
  }
  let prospectId = porte.prospectId
  if (prospectId) {
    const { error } = await supabase.from('prospects').update(champs).eq('id', prospectId)
    if (error) return { prospectId, erreur: error.message }
  } else {
    const { data, error } = await supabase.from('prospects').insert({
      ...champs, type_prospect: 'particulier', raison_sociale: null, source: 'Porte-à-porte', statut: 'Nouveau',
      statut_occupation: 'propriétaire_occupant', nombre_personnes_foyer: 1, zone_ile_de_france: false, fiches_cee: [],
      commercial: profil?.nom_complet || null, commercial_id: profil?.id || null,
    }).select('id').single()
    if (error || !data) return { prospectId: null, erreur: error?.message || 'Création du prospect impossible.' }
    prospectId = data.id as string
  }
  const contenu = `Porte-à-porte : ${libelleResultat(porte.resultat)}${porte.note.trim() ? ` — ${porte.note.trim()}` : ''}`
  await supabase.from('interactions').insert({
    prospect_id: prospectId, type: 'visite', contenu, auteur: profil?.nom_complet || profil?.email || null,
    meta: { canal: 'terrain', resultat: porte.resultat, lat: porte.lat, lng: porte.lng },
  })
  if (porte.resultat === 'rdv' && porte.dateRdv) {
    await supabase.from('tasks').insert({
      prospect_id: prospectId, titre: `RDV porte-à-porte — ${porte.prenom} ${porte.nom}`.trim(), description: porte.note.trim() || porte.adresse,
      type: 'relance', priorite: 'haute', assigne: profil?.nom_complet || '', due_at: new Date(porte.dateRdv).toISOString(), done: false,
    })
  }
  return { prospectId, erreur: null }
}
