import { supabase } from '../supabase'
import type { Profile } from '../auth/AuthContext'

/**
 * Tournées de porte-à-porte.
 *
 * Une tournée est d'abord enregistrée sur l'appareil (localStorage) pour fonctionner sans réseau,
 * puis sauvegardée dans les tables `tournees` / `tournee_portes` dès que le réseau est disponible :
 * elle est ainsi conservée si le téléphone change, visible du manager et comptée dans le classement.
 * Une porte « intéressé » ou « rendez-vous » devient en plus une fiche prospect du CRM.
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
    commentaires: porte.note.trim() || null,
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

/* ---------------------------------------------------------------- Sauvegarde serveur */

const estUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

/** Signature d'une tournée : permet de n'envoyer que les tournées modifiées depuis le dernier envoi. */
export const signatureTournee = (t: Tournee) => JSON.stringify([t.nom, t.date, t.objectif, t.portes.map(p => [p.id, p.majLe, p.resultat, p.prospectId])])

type LignePorte = {
  id: string; tournee_id: string; lat: number; lng: number; adresse: string; code_postal: string; ville: string; resultat: ResultatPorte
  note: string; prenom: string; nom: string; telephone: string; email: string; date_rdv: string; passages: number; prospect_id: string | null
  cree_le: string; maj_le: string
}

const versPorte = (l: LignePorte): Porte => ({
  id: l.id, lat: l.lat, lng: l.lng, adresse: l.adresse, codePostal: l.code_postal, ville: l.ville, resultat: l.resultat, note: l.note,
  prenom: l.prenom, nom: l.nom, telephone: l.telephone, email: l.email, dateRdv: l.date_rdv, passages: l.passages,
  prospectId: l.prospect_id, aSynchroniser: false, creeLe: l.cree_le, majLe: l.maj_le,
})

/** Tournées du commercial enregistrées en base (null si la lecture échoue, ex. hors-ligne). */
export async function chargerTourneesServeur(profilId: string): Promise<Tournee[] | null> {
  const { data: tournees, error } = await supabase.from('tournees').select('id,nom,date_tournee,objectif')
    .eq('commercial_id', profilId).order('date_tournee', { ascending: false }).limit(60)
  if (error) return null
  if (!tournees?.length) return []
  const { data: portes, error: errPortes } = await supabase.from('tournee_portes')
    .select('id,tournee_id,lat,lng,adresse,code_postal,ville,resultat,note,prenom,nom,telephone,email,date_rdv,passages,prospect_id,cree_le,maj_le')
    .in('tournee_id', tournees.map(t => t.id)).order('cree_le', { ascending: true }).limit(5000)
  if (errPortes) return null
  return tournees.map(t => ({
    id: t.id, nom: t.nom, date: t.date_tournee, objectif: t.objectif,
    portes: ((portes || []) as LignePorte[]).filter(p => p.tournee_id === t.id).map(versPorte),
  }))
}

/** Fusionne les tournées de l'appareil et celles du serveur : pour une même porte, la version la plus récente l'emporte. */
export function fusionnerTournees(locales: Tournee[], serveur: Tournee[]): Tournee[] {
  const parId = new Map<string, Tournee>()
  for (const t of serveur) parId.set(t.id, t)
  for (const t of locales) {
    const distante = parId.get(t.id)
    if (!distante) { parId.set(t.id, t); continue }
    const portes = new Map<string, Porte>()
    for (const p of distante.portes) portes.set(p.id, p)
    for (const p of t.portes) {
      const autre = portes.get(p.id)
      if (!autre || p.majLe >= autre.majLe) portes.set(p.id, p)
    }
    parId.set(t.id, { ...distante, nom: t.nom || distante.nom, objectif: t.objectif || distante.objectif, portes: [...portes.values()].sort((a, b) => a.creeLe.localeCompare(b.creeLe)) })
  }
  return [...parId.values()].sort((a, b) => b.date.localeCompare(a.date))
}

/** Enregistre une tournée et toutes ses portes en base. Renvoie un message d'erreur, ou null. */
export async function envoyerTournee(t: Tournee, profilId: string): Promise<string | null> {
  if (!estUuid(t.id)) return null // ancienne tournée locale sans identifiant compatible : conservée sur l'appareil
  const { error } = await supabase.from('tournees').upsert({ id: t.id, commercial_id: profilId, nom: t.nom, date_tournee: t.date, objectif: t.objectif })
  if (error) return error.message
  const portes = t.portes.filter(p => estUuid(p.id))
  if (portes.length) {
    const { error: errPortes } = await supabase.from('tournee_portes').upsert(portes.map(p => ({
      id: p.id, tournee_id: t.id, commercial_id: profilId, lat: p.lat, lng: p.lng, adresse: p.adresse, code_postal: p.codePostal, ville: p.ville,
      resultat: p.resultat, note: p.note, prenom: p.prenom, nom: p.nom, telephone: p.telephone, email: p.email, date_rdv: p.dateRdv,
      passages: p.passages, prospect_id: p.prospectId, cree_le: p.creeLe, maj_le: p.majLe,
    })))
    if (errPortes) return errPortes.message
  }
  // Portes retirées de la tournée sur l'appareil.
  let suppression = supabase.from('tournee_portes').delete().eq('tournee_id', t.id)
  if (portes.length) suppression = suppression.not('id', 'in', `(${portes.map(p => p.id).join(',')})`)
  const { error: errSuppr } = await suppression
  return errSuppr ? errSuppr.message : null
}

export interface LigneClassement { commercial_id: string; nom_complet: string; portes: number; contacts: number; interesses: number; rdv: number }

/** Classement de l'équipe depuis une date (même entreprise). */
export async function classementTerrain(depuis: Date): Promise<LigneClassement[] | null> {
  const { data, error } = await supabase.rpc('classement_terrain', { p_depuis: depuis.toISOString() })
  if (error) return null
  return ((data || []) as LigneClassement[]).map(l => ({ ...l, portes: Number(l.portes), contacts: Number(l.contacts), interesses: Number(l.interesses), rdv: Number(l.rdv) }))
}

/** Lundi de la semaine en cours, 0 h. */
export function debutSemaine(d = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
