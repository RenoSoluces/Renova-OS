/**
 * Transformation des rendez-vous Google Agenda en fiches prospects à vérifier avant import.
 * Les règles sont volontairement prudentes : tout est pré-rempli mais modifiable, et un RDV
 * qui ressemble à un événement personnel ou à un contact déjà présent est décoché d'office.
 */
export interface RdvGoogle {
  id: string
  titre: string
  date: string
  heure: string | null
  lieu: string
  description: string
  participants: { email: string; nom: string }[]
}

export interface CandidatProspect {
  rdvId: string
  date: string
  heure: string | null
  titreOrigine: string
  civilite: string
  prenom: string
  nom: string
  telephone: string
  email: string
  adresse: string
  codePostal: string
  ville: string
  notes: string
  /** Nom du prospect déjà présent dans le CRM, s'il y en a un. */
  doublon: string | null
  probablementPerso: boolean
  selection: boolean
}

export interface ProspectExistant { id: string; nom?: string | null; prenom?: string | null; telephone?: string | null; email?: string | null; code_postal?: string | null }

const PREFIXES = /^(?:rdv|r\.?d\.?v\.?|rendez[\s-]?vous|vt|v\.t\.?|visite(?:\s+technique)?|r[123]|1er\s+rdv|2e\s+rdv|signature|relance|devis|rappel|rappeler|audit|install(?:ation)?|chantier|pose|sav)\b[\s:.\-–—·|/]*/i
const CIVILITES: [RegExp, string][] = [
  [/^(?:m\.?\s*(?:et|&)\s*mme\.?|mr\s*(?:et|&)\s*mme|monsieur\s+et\s+madame)\s+/i, 'M. et Mme'],
  [/^(?:mme\.?|madame)\s+/i, 'Mme'],
  [/^(?:mlle\.?|mademoiselle)\s+/i, 'Mme'],
  [/^(?:m\.|mr\.?|monsieur)\s+/i, 'M.'],
]
const PERSO = /\b(anniv|anniversaire|dentiste|m[ée]decin|docteur|kin[ée]|ost[ée]o|resto|restaurant|d[ée]jeuner|d[îi]ner|ap[ée]ro|r[ée]union|meeting|visio|teams|zoom|point\s+hebdo|call|formation|cong[ée]s?|vacances|sport|foot|salle|[ée]cole|cr[èe]che|perso|banque|notaire|garage|coiffeur|courses|anniv|f[ée]ri[ée]|bday)\b/i
const RE_TEL = /(?:\+33\s?|0033\s?|0)[1-9](?:[\s.\-]?\d{2}){4}/
const RE_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const RE_CP_VILLE = /\b(\d{5})\s+([A-Za-zÀ-ÿ'’\- ]{2,}?)(?:\s*,|\s*$|\s+france\b)/i

const majuscule = (mot: string) => mot.length > 1 && mot === mot.toUpperCase() && /[A-ZÀ-Ý]/.test(mot)
const capitaliser = (s: string) => s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())

export function normaliserTelephone(t: string | null | undefined): string {
  const chiffres = String(t || '').replace(/\D/g, '')
  if (!chiffres) return ''
  const national = chiffres.startsWith('33') ? `0${chiffres.slice(2)}` : chiffres.startsWith('0033') ? `0${chiffres.slice(4)}` : chiffres
  return national.length === 10 ? national.replace(/(\d{2})(?=\d)/g, '$1 ') : national
}
const cleTelephone = (t: string | null | undefined) => String(t || '').replace(/\D/g, '').slice(-9)

/** Extrait civilité, prénom et nom du titre d'un RDV (« RDV M. DUPONT Jean - PAC » → M., Jean, Dupont). */
export function nomDepuisTitre(titre: string): { civilite: string; prenom: string; nom: string } {
  let t = titre.replace(RE_TEL, ' ').replace(RE_EMAIL, ' ').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 3; i++) t = t.replace(PREFIXES, '').trim()
  // Ce qui suit un séparateur décrit généralement le projet (« Dupont - PAC air/eau »).
  const coupe = t.split(/\s+[-–—|/:]\s+|\s*\(|\s*[–—|]\s*/)[0].trim()
  t = (coupe || t).replace(/[,;.]+$/, '').trim()
  let civilite = ''
  for (const [re, valeur] of CIVILITES) if (re.test(t)) { civilite = valeur; t = t.replace(re, '').trim(); break }
  const mots = t.split(/\s+/).filter(m => m && !/^\d+$/.test(m)).slice(0, 4)
  if (!mots.length) return { civilite, prenom: '', nom: '' }
  if (mots.length === 1) return { civilite, prenom: '', nom: capitaliser(mots[0]) }
  const enMajuscules = mots.filter(majuscule)
  if (enMajuscules.length && enMajuscules.length < mots.length) {
    return { civilite, nom: capitaliser(enMajuscules.join(' ')), prenom: capitaliser(mots.filter(m => !majuscule(m)).join(' ')) }
  }
  // Sans indice de casse : « Prénom Nom » si le premier mot ressemble à un prénom courant, sinon « Nom Prénom ».
  return { civilite, prenom: capitaliser(mots[0]), nom: capitaliser(mots.slice(1).join(' ')) }
}

/** Découpe un lieu Google (« 12 rue des Lilas, 69003 Lyon, France ») en adresse, code postal et ville. */
export function adresseDepuisLieu(lieu: string): { adresse: string; codePostal: string; ville: string } {
  const propre = lieu.replace(/\s+/g, ' ').trim()
  const m = propre.match(RE_CP_VILLE)
  if (!m) return { adresse: propre.replace(/,?\s*france$/i, ''), codePostal: '', ville: '' }
  const avant = propre.slice(0, m.index).replace(/[,\s]+$/, '').trim()
  return { adresse: avant, codePostal: m[1], ville: capitaliser(m[2].trim()) }
}

export function analyserRdv(rdv: RdvGoogle, existants: ProspectExistant[]): CandidatProspect {
  const texte = `${rdv.titre}\n${rdv.description}\n${rdv.lieu}`
  const { civilite, prenom, nom } = nomDepuisTitre(rdv.titre)
  const participant = rdv.participants[0]
  const telephone = normaliserTelephone(texte.match(RE_TEL)?.[0])
  const email = (rdv.description.match(RE_EMAIL)?.[0] || participant?.email || '').toLowerCase()
  const { adresse, codePostal, ville } = adresseDepuisLieu(rdv.lieu)
  const notes = rdv.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)

  const tel9 = cleTelephone(telephone)
  const doublonTrouve = existants.find(p =>
    (tel9.length === 9 && cleTelephone(p.telephone) === tel9)
    || (email && String(p.email || '').toLowerCase() === email)
    || (nom && codePostal && String(p.nom || '').toLowerCase() === nom.toLowerCase() && p.code_postal === codePostal))
  const probablementPerso = PERSO.test(rdv.titre) || (!telephone && !email && !codePostal && !adresse)
  const nomFinal = nom || (participant?.nom ? capitaliser(participant.nom.split(' ').slice(-1)[0]) : '')
  return {
    rdvId: rdv.id, date: rdv.date, heure: rdv.heure, titreOrigine: rdv.titre,
    civilite, prenom: prenom || (participant?.nom && !nom ? capitaliser(participant.nom.split(' ')[0]) : ''), nom: nomFinal,
    telephone, email, adresse, codePostal, ville, notes,
    doublon: doublonTrouve ? `${doublonTrouve.prenom || ''} ${doublonTrouve.nom || ''}`.trim() || 'Contact existant' : null,
    probablementPerso,
    selection: !doublonTrouve && !probablementPerso && !!nomFinal,
  }
}
