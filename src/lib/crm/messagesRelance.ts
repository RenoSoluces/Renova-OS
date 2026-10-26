/**
 * Messages de relance prêts à envoyer par SMS ou WhatsApp (ou e-mail), selon la situation.
 * Courts, polis, signés du prénom du commercial : faits pour être envoyés tels quels en un geste.
 */
export type ContexteRelance = 'relance' | 'rdv' | 'devis' | 'pieces' | 'apres_rdv' | 'installation'

export interface InfosRelance {
  prenomClient?: string | null
  civilite?: string | null
  nomClient?: string | null
  commercial?: string | null
  entreprise?: string | null
  date?: string | null
  heure?: string | null
  numeroDevis?: string | null
  pieces?: string[]
  lienEspace?: string | null
  installateur?: string | null
  dureeJours?: number | null
}

export interface ModeleMessage { id: string; label: string; message: string }

const salutation = (i: InfosRelance) => {
  if (i.prenomClient?.trim()) return `Bonjour ${i.prenomClient.trim()}`
  if (i.nomClient?.trim()) return `Bonjour ${i.civilite?.trim() ? `${i.civilite.trim()} ` : ''}${i.nomClient.trim()}`
  return 'Bonjour'
}
const signature = (i: InfosRelance) => [i.commercial?.split(' ')[0], i.entreprise].filter(Boolean).join(' – ')
const quand = (i: InfosRelance) => {
  if (!i.date) return ''
  const d = new Date(`${i.date}T12:00:00`)
  const auj = new Date(); auj.setHours(12, 0, 0, 0)
  const ecart = Math.round((d.getTime() - auj.getTime()) / 86400000)
  const jour = ecart === 0 ? 'aujourd’hui' : ecart === 1 ? 'demain' : `le ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
  return `${jour}${i.heure ? ` à ${i.heure.slice(0, 5).replace(':', 'h')}` : ''}`
}

export function modelesRelance(contexte: ContexteRelance, i: InfosRelance): ModeleMessage[] {
  const bonjour = salutation(i)
  const sig = signature(i)
  const fin = sig ? `\n\n${sig}` : ''
  switch (contexte) {
    case 'rdv':
      return [
        { id: 'confirmation', label: 'Confirmer le RDV', message: `${bonjour}, je vous confirme notre rendez-vous ${quand(i) || 'prévu'} pour votre projet. Pensez à avoir votre dernier avis d’impôt et une facture d’énergie sous la main. À très vite !${fin}` },
        { id: 'route', label: 'En route', message: `${bonjour}, je suis en route pour notre rendez-vous, j’arrive dans une vingtaine de minutes.${fin}` },
        { id: 'retard', label: 'Léger retard', message: `${bonjour}, je vais avoir une dizaine de minutes de retard pour notre rendez-vous, toutes mes excuses. À tout de suite.${fin}` },
      ]
    case 'installation':
      return [
        { id: 'date', label: 'Date de pose', message: `${bonjour}, bonne nouvelle : l’installation de votre équipement est prévue ${quand(i) || 'prochainement'}${i.dureeJours && i.dureeJours > 1 ? ` (environ ${i.dureeJours} jours de travaux)` : ''}${i.installateur ? `, réalisée par ${i.installateur}` : ''}. Merci de prévoir un accès dégagé aux zones de travaux. Je reste à votre disposition.${fin}` },
        { id: 'veille', label: 'Rappel la veille', message: `${bonjour}, petit rappel : l’équipe d’installation intervient chez vous ${quand(i) || 'demain'}. À bientôt !${fin}` },
      ]
    case 'apres_rdv':
      return [
        { id: 'merci', label: 'Merci pour le RDV', message: `${bonjour}, merci pour votre accueil aujourd’hui. Comme convenu, je reviens vers vous très vite avec votre proposition et le montant des aides. N’hésitez pas si vous avez une question.${fin}` },
      ]
    case 'devis':
      return [
        { id: 'douce', label: 'Relance douce', message: `${bonjour}, avez-vous pu prendre connaissance de votre devis${i.numeroDevis ? ` ${i.numeroDevis}` : ''} ? Je reste disponible pour répondre à vos questions ou ajuster la proposition.${i.lienEspace ? `\nVous pouvez le consulter et le signer en ligne ici : ${i.lienEspace}` : ''}${fin}` },
        { id: 'aides', label: 'Aides limitées', message: `${bonjour}, je reviens vers vous concernant votre devis${i.numeroDevis ? ` ${i.numeroDevis}` : ''}. Les montants d’aides évoluent régulièrement : pour bénéficier des conditions actuelles, mieux vaut valider rapidement. Voulez-vous qu’on en parle 5 minutes au téléphone ?${fin}` },
        { id: 'derniere', label: 'Dernière relance', message: `${bonjour}, sans nouvelles de votre part, je me permets une dernière relance au sujet de votre projet. Si ce n’est plus d’actualité, un simple « non merci » me suffit, je ne vous dérangerai plus.${fin}` },
      ]
    case 'pieces': {
      const liste = (i.pieces || []).length ? `\n${(i.pieces || []).map(p => `• ${p}`).join('\n')}` : ''
      return [
        { id: 'pieces', label: 'Pièces manquantes', message: `${bonjour}, pour finaliser votre dossier d’aides, il nous manque encore :${liste}\n${i.lienEspace ? `Vous pouvez les envoyer en photo directement ici : ${i.lienEspace}` : 'Une simple photo envoyée en réponse à ce message suffit.'}\nMerci beaucoup !${fin}` },
      ]
    }
    default:
      return [
        { id: 'prise_nouvelles', label: 'Prendre des nouvelles', message: `${bonjour}, je me permets de revenir vers vous au sujet de votre projet de rénovation. Où en êtes-vous de votre réflexion ? Je peux vous rappeler quand cela vous arrange.${fin}` },
        { id: 'aides', label: 'Rappel des aides', message: `${bonjour}, petite information : vous pouvez encore bénéficier d’aides importantes pour votre projet (MaPrimeRénov’, prime CEE). Voulez-vous que je refasse le point sur votre éligibilité ?${fin}` },
        { id: 'creneau', label: 'Proposer un créneau', message: `${bonjour}, je serai dans votre secteur prochainement. Seriez-vous disponible pour un rendez-vous de 30 minutes afin de faire le point sur votre projet ?${fin}` },
      ]
  }
}
