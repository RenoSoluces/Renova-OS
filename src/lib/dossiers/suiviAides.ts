/**
 * Suivi administratif des aides (CEE, MaPrimeRénov') d'un dossier : pièces attendues, étapes, échéances
 * et alertes.
 *
 * Règles retenues :
 * - CEE : l'offre / le cadre de contribution du financeur doit être accepté AVANT la signature du devis
 *   (rôle incitatif de la prime) ; dépôt du dossier après facture, avec une échéance interne de 30 jours et
 *   un délai limite paramétrable (12 mois par défaut, à confirmer avec le délégataire).
 * - MaPrimeRénov' : la demande doit être déposée AVANT le démarrage des travaux ; le solde est demandé
 *   avec la facture une fois les travaux terminés (échéance interne de 15 jours).
 * - Pièces manquantes : une demande au client sans réponse depuis 7 jours déclenche une relance.
 */
export type Aide = 'cee' | 'mpr'

export interface SuiviAides {
  cee?: { offre_acceptee?: string; depot?: string; validation?: string; paiement?: string; delai_depot_mois?: number }
  mpr?: { depot?: string; accord?: string; demande_solde?: string; paiement?: string }
  facture?: string
}

export interface PieceAttendue { type: string; nom: string; categorie: string; aide: Aide | 'commun'; etape: 'avant_travaux' | 'apres_travaux' }

export interface PieceDossier { id?: string; type: string | null; nom: string; recu?: boolean | null; url?: string | null; obligatoire?: boolean | null; etape?: string | null; demande_le?: string | null }

const COMMUNES: PieceAttendue[] = [
  { type: 'avis_imposition', nom: 'Avis d’impôt (dernier avis)', categorie: 'Administratif', aide: 'commun', etape: 'avant_travaux' },
  { type: 'piece_identite', nom: 'Pièce d’identité', categorie: 'Administratif', aide: 'commun', etape: 'avant_travaux' },
  { type: 'taxe_fonciere', nom: 'Taxe foncière (justificatif de propriété)', categorie: 'Administratif', aide: 'commun', etape: 'avant_travaux' },
  { type: 'facture', nom: 'Facture des travaux', categorie: 'Contractuel', aide: 'commun', etape: 'apres_travaux' },
]
const CEE: PieceAttendue[] = [
  { type: 'cee_offre', nom: 'Offre CEE / cadre de contribution signé (avant le devis)', categorie: 'CEE', aide: 'cee', etape: 'avant_travaux' },
  { type: 'attestation_honneur', nom: 'Attestation sur l’honneur signée', categorie: 'CEE', aide: 'cee', etape: 'apres_travaux' },
  { type: 'photos', nom: 'Photos avant et après travaux', categorie: 'Technique', aide: 'cee', etape: 'apres_travaux' },
  { type: 'certificat_rge', nom: 'Certificat RGE de l’installateur', categorie: 'CEE', aide: 'cee', etape: 'avant_travaux' },
]
const CEE_PAC: PieceAttendue[] = [
  { type: 'note_dimensionnement', nom: 'Note de dimensionnement de la PAC', categorie: 'Technique', aide: 'cee', etape: 'apres_travaux' },
]
const MPR: PieceAttendue[] = [
  { type: 'mpr_depot', nom: 'Accusé de dépôt MaPrimeRénov’ (avant travaux)', categorie: 'MaPrimeRénov’', aide: 'mpr', etape: 'avant_travaux' },
  { type: 'mpr_accord', nom: 'Notification d’accord MaPrimeRénov’', categorie: 'MaPrimeRénov’', aide: 'mpr', etape: 'avant_travaux' },
  { type: 'rib', nom: 'RIB du bénéficiaire', categorie: 'Administratif', aide: 'mpr', etape: 'apres_travaux' },
]

/** Pièces attendues selon les aides du dossier et les fiches CEE du client. */
export function piecesAttendues(aides: Aide[], fichesCee: string[] = []): PieceAttendue[] {
  const liste = [...COMMUNES]
  if (aides.includes('cee')) {
    liste.push(...CEE)
    if (fichesCee.some(f => /BAR-TH-1(71|72|59)/.test(f))) liste.push(...CEE_PAC)
  }
  if (aides.includes('mpr')) liste.push(...MPR)
  return liste
}

/** Pièces attendues absentes de la liste du dossier (à ajouter). */
export function piecesAAjouter(aides: Aide[], fichesCee: string[], existantes: PieceDossier[]): PieceAttendue[] {
  const types = new Set(existantes.map(p => p.type))
  return piecesAttendues(aides, fichesCee).filter(p => !types.has(p.type))
}

export type EtatEtape = 'fait' | 'a_faire' | 'en_retard' | 'bloquant'
export interface Etape { id: string; aide: Aide | 'commun'; label: string; date?: string | null; echeance?: string | null; etat: EtatEtape; detail?: string }

const jour = 86400000
const ajouterJours = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * jour).toISOString().slice(0, 10)
const ajouterMois = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }
const recue = (p: PieceDossier) => !!(p.recu || p.url)

export interface ContexteDossier {
  aides: Aide[]
  suivi: SuiviAides
  signatureDevis?: string | null
  installationPrevue?: string | null
  installation?: string | null
  pieces: PieceDossier[]
  maintenant?: Date
}

export function etapesDossier(c: ContexteDossier): Etape[] {
  const maintenant = c.maintenant || new Date()
  const auj = maintenant.toISOString().slice(0, 10)
  const etapes: Etape[] = []
  const passe = (iso?: string | null) => !!iso && iso.slice(0, 10) < auj
  const debutTravaux = c.installation || c.installationPrevue || null

  // Pièces avant travaux : à réunir avant l'installation.
  const avant = c.pieces.filter(p => p.etape === 'avant_travaux' && p.obligatoire)
  const manquantesAvant = avant.filter(p => !recue(p))
  if (avant.length) {
    const echeance = c.installationPrevue ? ajouterJours(c.installationPrevue, -7) : null
    etapes.push({ id: 'pieces_avant', aide: 'commun', label: 'Pièces avant travaux', echeance,
      etat: !manquantesAvant.length ? 'fait' : passe(echeance) || (c.installation && manquantesAvant.length) ? 'en_retard' : 'a_faire',
      detail: manquantesAvant.length ? `${manquantesAvant.length} manquante(s) : ${manquantesAvant.map(p => p.nom).join(', ')}` : 'Complet' })
  }

  if (c.aides.includes('cee')) {
    const s = c.suivi.cee || {}
    const offreApresDevis = !!(s.offre_acceptee && c.signatureDevis && s.offre_acceptee.slice(0, 10) > c.signatureDevis.slice(0, 10))
    etapes.push({ id: 'cee_offre', aide: 'cee', label: 'Offre CEE acceptée avant le devis', date: s.offre_acceptee, echeance: c.signatureDevis?.slice(0, 10) || null,
      etat: offreApresDevis ? 'bloquant' : s.offre_acceptee ? 'fait' : c.signatureDevis ? 'bloquant' : 'a_faire',
      detail: offreApresDevis ? 'Offre datée après la signature du devis : la prime CEE risque d’être refusée.' : !s.offre_acceptee && c.signatureDevis ? 'Devis signé sans date d’offre CEE renseignée : vérifiez que l’offre a bien été acceptée avant.' : undefined })
    const facture = c.suivi.facture
    const limite = facture ? ajouterMois(facture, s.delai_depot_mois || 12) : null
    const cible = facture ? ajouterJours(facture, 30) : null
    etapes.push({ id: 'cee_depot', aide: 'cee', label: 'Dépôt du dossier CEE', date: s.depot, echeance: cible,
      etat: s.depot ? 'fait' : !facture ? 'a_faire' : passe(limite) ? 'bloquant' : passe(cible) ? 'en_retard' : 'a_faire',
      detail: facture && !s.depot ? `Objectif sous 30 jours après facture ; limite le ${new Date(limite!).toLocaleDateString('fr-FR')}.` : !facture ? 'Après la facture des travaux.' : undefined })
    etapes.push({ id: 'cee_paiement', aide: 'cee', label: 'Prime CEE versée', date: s.paiement, etat: s.paiement ? 'fait' : 'a_faire' })
  }

  if (c.aides.includes('mpr')) {
    const s = c.suivi.mpr || {}
    const depotApresTravaux = !!(s.depot && debutTravaux && s.depot.slice(0, 10) > debutTravaux.slice(0, 10))
    etapes.push({ id: 'mpr_depot', aide: 'mpr', label: 'Demande MaPrimeRénov’ déposée avant travaux', date: s.depot, echeance: debutTravaux?.slice(0, 10) || null,
      etat: depotApresTravaux ? 'bloquant' : s.depot ? 'fait' : debutTravaux && passe(debutTravaux) ? 'bloquant' : 'a_faire',
      detail: depotApresTravaux ? 'Demande déposée après le début des travaux : l’aide n’est plus accordée.' : !s.depot ? 'À déposer avant le démarrage des travaux.' : undefined })
    etapes.push({ id: 'mpr_accord', aide: 'mpr', label: 'Accord MaPrimeRénov’ reçu', date: s.accord,
      etat: s.accord ? 'fait' : s.depot && c.installationPrevue && !passe(c.installationPrevue) && c.installationPrevue <= ajouterJours(auj, 7) ? 'en_retard' : 'a_faire',
      detail: !s.accord && s.depot ? 'Attendre l’accord avant d’installer.' : undefined })
    const fin = c.installation
    const cible = fin ? ajouterJours(fin, 15) : null
    etapes.push({ id: 'mpr_solde', aide: 'mpr', label: 'Demande de solde (facture transmise)', date: s.demande_solde, echeance: cible,
      etat: s.demande_solde ? 'fait' : passe(cible) ? 'en_retard' : 'a_faire', detail: !fin ? 'Après l’installation.' : undefined })
    etapes.push({ id: 'mpr_paiement', aide: 'mpr', label: 'MaPrimeRénov’ versée', date: s.paiement, etat: s.paiement ? 'fait' : 'a_faire' })
  }

  // Relance des pièces demandées au client.
  const demandees = c.pieces.filter(p => p.demande_le && !recue(p))
  if (demandees.length) {
    const plusAncienne = demandees.map(p => p.demande_le!).sort()[0]
    const relance = ajouterJours(plusAncienne, 7)
    etapes.push({ id: 'relance_pieces', aide: 'commun', label: 'Relancer le client pour les pièces', echeance: relance,
      etat: passe(relance) ? 'en_retard' : 'a_faire', detail: `${demandees.length} pièce(s) demandée(s) le ${new Date(plusAncienne).toLocaleDateString('fr-FR')}` })
  }
  return etapes
}

export const alertesDossier = (etapes: Etape[]) => etapes.filter(e => e.etat === 'en_retard' || e.etat === 'bloquant')

/** Texte de l'e-mail de demande de pièces au client. */
export function messageDemandePieces(prenom: string | null | undefined, pieces: { nom: string }[], reference?: string | null): string {
  return [
    `Bonjour${prenom ? ` ${prenom}` : ''},`,
    `Pour constituer votre dossier d’aides${reference ? ` (${reference})` : ''}, il nous manque encore les documents suivants :`,
    pieces.map(p => `• ${p.nom}`).join('\n'),
    'Vous pouvez simplement répondre à cet e-mail en joignant une photo lisible ou un PDF de chaque document.',
    'Merci d’avance, et n’hésitez pas à nous appeler si vous avez une question.',
    'Bien cordialement,',
  ].join('\n\n')
}
