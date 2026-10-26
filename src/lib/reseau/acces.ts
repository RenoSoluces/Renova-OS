/**
 * Accès « Mon réseau » : mot de passe provisoire et message d'invitation prêt à partager
 * (WhatsApp, SMS, e-mail ou partage natif du téléphone).
 */
export type TypeAcces = 'apporteur' | 'partenaire' | 'commercial'

export const LIBELLES_ACCES: Record<TypeAcces, { label: string; role: string; description: string }> = {
  apporteur: { label: 'Apporteur d’affaires', role: 'apporteur', description: 'Recommande des clients et suit ses dossiers et commissions.' },
  partenaire: { label: 'Partenaire (société)', role: 'partner_admin', description: 'Dirigeant d’une société partenaire : son entreprise a son propre espace.' },
  commercial: { label: 'Commercial de mon équipe', role: 'commercial', description: 'Rejoint votre équipe commerciale.' },
}

const MAJ = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MIN = 'abcdefghijkmnopqrstuvwxyz'
const CHIFFRES = '23456789'
const SPECIAUX = '!@#$%&*?+='

function aleatoire(n: number): number {
  const tableau = new Uint32Array(1)
  crypto.getRandomValues(tableau)
  return tableau[0] % n
}

/** Mot de passe provisoire lisible (sans caractères ambigus) : 14 caractères, maj, min, chiffre, spécial. */
export function genererMotDePasse(longueur = 14): string {
  const tous = MAJ + MIN + CHIFFRES + SPECIAUX
  const car = [MAJ, MIN, CHIFFRES, SPECIAUX].map(s => s[aleatoire(s.length)])
  while (car.length < longueur) car.push(tous[aleatoire(tous.length)])
  for (let i = car.length - 1; i > 0; i--) { const j = aleatoire(i + 1); [car[i], car[j]] = [car[j], car[i]] }
  return car.join('')
}

export const motDePasseValide = (m: string) => m.length >= 12 && /[A-Z]/.test(m) && /[a-z]/.test(m) && /\d/.test(m) && /[^A-Za-z0-9]/.test(m)

export interface InfosAcces {
  prenom: string
  type: TypeAcces
  email: string
  motDePasse?: string | null
  lien: string
  entreprise: string
  invitePar: string
}

/** Message d'invitation, prêt à envoyer tel quel. */
export function messageAcces(i: InfosAcces): string {
  const role = i.type === 'apporteur' ? 'apporteur d’affaires' : i.type === 'partenaire' ? 'partenaire' : 'membre de l’équipe'
  const lignes = [
    `Bonjour${i.prenom ? ` ${i.prenom}` : ''} 👋`,
    '',
    `${i.invitePar} vous a créé un accès ${role} sur Renova OS (${i.entreprise}).`,
    '',
  ]
  if (i.motDePasse) {
    lignes.push('🔗 Connexion : ' + i.lien, `👤 Identifiant : ${i.email}`, `🔑 Mot de passe provisoire : ${i.motDePasse}`, '', 'Vous choisirez votre propre mot de passe à la première connexion.')
  } else {
    lignes.push('🔗 Activez votre compte et choisissez votre mot de passe ici :', i.lien, '', 'Ce lien est personnel et valable pour une durée limitée.')
  }
  lignes.push('', i.type === 'apporteur' ? 'Vous pourrez y transmettre vos contacts et suivre l’avancement de vos dossiers et commissions.' : 'Vous pourrez y suivre vos dossiers en temps réel.', '', 'À très vite !')
  return lignes.join('\n')
}

/** Numéro au format international sans « + » pour wa.me (France par défaut). */
export function numeroWhatsApp(telephone: string | null | undefined): string | null {
  const chiffres = String(telephone || '').replace(/[^\d+]/g, '')
  if (!chiffres) return null
  if (chiffres.startsWith('+')) return chiffres.slice(1)
  if (chiffres.startsWith('00')) return chiffres.slice(2)
  if (chiffres.startsWith('0') && chiffres.length === 10) return `33${chiffres.slice(1)}`
  return chiffres.length >= 10 ? chiffres : null
}
