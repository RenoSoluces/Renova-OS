/**
 * Suivi de l'avancement d'un dossier d'aide à l'Anah (MaPrimeRénov' / MonProjetAnah).
 *
 * Il n'existe pas d'API publique pour lire l'état d'un dossier : l'Anah propose aux mandataires un tableau de bord
 * avec des exports PDF / Excel. Les statuts ci-dessous reprennent ceux de ce tableau de bord (guide mandataire, 2025).
 */
export type PhaseMpr = 'subvention' | 'solde' | 'cloture'

export const LIBELLES_PHASE: Record<PhaseMpr, string> = {
  subvention: 'Demande de subvention',
  solde: 'Demande de solde',
  cloture: 'Dossier clôturé',
}

export interface StatutMpr {
  phase: PhaseMpr
  statut: string
  signification: string
  /** Le mandataire ou l'usager doit agir : relance à prévoir. */
  action?: boolean
}

export const STATUTS_MPR: StatutMpr[] = [
  { phase: 'subvention', statut: 'Déposée', signification: 'Demande en cours de traitement par l\'Anah.' },
  { phase: 'subvention', statut: 'Dossier déposé – départ d\'instruction', signification: 'Instruction sur le point de démarrer.' },
  { phase: 'subvention', statut: 'En cours d\'instruction', signification: 'Instruction en cours normale.' },
  { phase: 'subvention', statut: 'En attente de compléments d\'information', signification: 'L\'Anah attend une réponse du mandataire ou de l\'usager.', action: true },
  { phase: 'subvention', statut: 'Compléments demandés reçus', signification: 'Réponse reçue, l\'instruction doit reprendre.' },
  { phase: 'solde', statut: 'En attente de dépôt usager/mandataire', signification: 'Prime réservée : la demande de solde peut être déposée.', action: true },
  { phase: 'solde', statut: 'Dossier déposé – départ d\'instruction', signification: 'Demande de solde déposée, instruction imminente.' },
  { phase: 'solde', statut: 'En cours d\'instruction', signification: 'Instruction en cours normale.' },
  { phase: 'solde', statut: 'En cours d\'instruction – réexamen', signification: 'Nouvelle instruction suite à une difficulté relevée.' },
  { phase: 'solde', statut: 'Demande de compléments usager/mandataire', signification: 'Précisions ou justificatifs attendus.', action: true },
  { phase: 'solde', statut: 'Instruction en cours suite à un contrôle sur place', signification: 'Rapport de contrôle reçu, instruction en reprise.' },
  { phase: 'solde', statut: 'Compléments demandés reçus', signification: 'Réponse reçue, instruction en reprise.' },
  { phase: 'solde', statut: 'En cours de contrôle au paiement', signification: 'Vérifications finales avant paiement.' },
  { phase: 'solde', statut: 'Attente de réponse – information préalable', signification: 'Retrait de prime envisagé : 2 mois pour faire des observations.', action: true },
  { phase: 'solde', statut: 'Information préalable – réponse réceptionnée', signification: 'Observations reçues, en cours d\'examen.' },
  { phase: 'cloture', statut: 'Acceptée pour paiement', signification: 'Dossier payé par l\'Anah.' },
  { phase: 'cloture', statut: 'Subvention rejetée', signification: 'Demande de subvention refusée.' },
  { phase: 'cloture', statut: 'Solde rejeté', signification: 'Subvention retirée suite à une irrégularité au solde.' },
]

export const statutsDePhase = (phase: PhaseMpr): StatutMpr[] => STATUTS_MPR.filter(s => s.phase === phase)

/** Minuscules, sans accents, tirets et apostrophes ramenés à des espaces : « Dossier déposé – départ d'instruction ». */
export function normaliserTexte(t: unknown): string {
  return String(t ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‐-―−'’`-]/g, ' ')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retrouve le statut Anah à partir d'un texte (export Excel, saisie). Quand un même libellé existe dans plusieurs
 * phases, `phaseIndice` (onglet de l'export) départage ; sinon on prend la première phase qui le porte.
 */
export function trouverStatut(texte: string, phaseIndice?: PhaseMpr): StatutMpr | null {
  const n = normaliserTexte(texte)
  if (!n) return null
  const exacts = STATUTS_MPR.filter(s => normaliserTexte(s.statut) === n)
  const candidats = exacts.length ? exacts : STATUTS_MPR.filter(s => n.includes(normaliserTexte(s.statut)))
  if (candidats.length === 0) return null
  return candidats.find(s => s.phase === phaseIndice) ?? candidats[0]
}

export const actionRequise = (statut?: string | null): boolean => !!statut && !!STATUTS_MPR.find(s => normaliserTexte(s.statut) === normaliserTexte(statut))?.action

// ---------------------------------------------------------------------------------------------------------------
// Import de l'export Excel du tableau de bord mandataire
// ---------------------------------------------------------------------------------------------------------------
export interface ColonnesExport { numero?: number; nom?: number; prenom?: number; nomComplet?: number; statut?: number }

/** Devine les colonnes utiles d'après leurs en-têtes ; l'écran permet de corriger. */
export function detecterColonnes(entetes: string[]): ColonnesExport {
  const idx = (re: RegExp) => { const i = entetes.findIndex(e => re.test(normaliserTexte(e))); return i === -1 ? undefined : i }
  return {
    numero: idx(/\b(n ?° ?)?(dossier|demande)\b.*(num|n )|numero|^n dossier|^reference/) ?? idx(/dossier/),
    prenom: idx(/^prenom|prenom (du )?(demandeur|beneficiaire|usager|menage)/),
    nom: idx(/^nom$|^nom (du )?(demandeur|beneficiaire|usager|menage|de famille)|nom de famille/),
    nomComplet: idx(/(demandeur|beneficiaire|usager|menage)$|^nom (et )?prenom|^identite/),
    statut: idx(/statut|etat|situation/),
  }
}

export interface LigneImport { numero: string; nom: string; prenom: string; statutBrut: string }

export function lignesDepuisTableau(lignes: unknown[][], colonnes: ColonnesExport): LigneImport[] {
  const val = (l: unknown[], i?: number) => (i == null ? '' : String(l[i] ?? '').trim())
  return lignes
    .map(l => {
      let nom = val(l, colonnes.nom), prenom = val(l, colonnes.prenom)
      if (!nom && !prenom && colonnes.nomComplet != null) {
        const parties = val(l, colonnes.nomComplet).split(/\s+/).filter(Boolean)
        nom = parties.slice(-1).join(' '); prenom = parties.slice(0, -1).join(' ')
      }
      return { numero: val(l, colonnes.numero), nom, prenom, statutBrut: val(l, colonnes.statut) }
    })
    .filter(l => l.numero || l.nom || l.prenom)
}

export interface DossierRapprochable {
  id: string
  reference: string | null
  mpr_numero_dossier: string | null
  mpr_statut: string | null
  nom: string
  prenom: string
}

export interface Correspondance {
  dossier: DossierRapprochable
  ligne: LigneImport
  methode: 'numero' | 'nom'
  statut: StatutMpr | null
  changement: boolean
}

export interface ResultatRapprochement {
  correspondances: Correspondance[]
  /** Aucun dossier ne correspond (ou plusieurs : homonymes). */
  nonTrouvees: { ligne: LigneImport; raison: 'introuvable' | 'ambigu' }[]
}

const cleNom = (n: string, p: string) => `${normaliserTexte(n)}|${normaliserTexte(p)}`
const numeroNormalise = (n?: string | null) => String(n ?? '').replace(/[\s.-]/g, '').toUpperCase()

export function rapprocher(lignes: LigneImport[], dossiers: DossierRapprochable[], phaseIndice?: PhaseMpr): ResultatRapprochement {
  const parNumero = new Map<string, DossierRapprochable>()
  for (const d of dossiers) if (d.mpr_numero_dossier) parNumero.set(numeroNormalise(d.mpr_numero_dossier), d)
  const parNom = new Map<string, DossierRapprochable[]>()
  for (const d of dossiers) { const k = cleNom(d.nom, d.prenom); parNom.set(k, [...(parNom.get(k) || []), d]) }

  const correspondances: Correspondance[] = []
  const nonTrouvees: ResultatRapprochement['nonTrouvees'] = []
  for (const ligne of lignes) {
    let dossier = ligne.numero ? parNumero.get(numeroNormalise(ligne.numero)) : undefined
    let methode: 'numero' | 'nom' = 'numero'
    if (!dossier) {
      methode = 'nom'
      const candidats = parNom.get(cleNom(ligne.nom, ligne.prenom)) || []
      if (candidats.length > 1) { nonTrouvees.push({ ligne, raison: 'ambigu' }); continue }
      dossier = candidats[0]
    }
    if (!dossier) { nonTrouvees.push({ ligne, raison: 'introuvable' }); continue }
    const statut = trouverStatut(ligne.statutBrut, phaseIndice)
    correspondances.push({ dossier, ligne, methode, statut, changement: !!statut && normaliserTexte(statut.statut) !== normaliserTexte(dossier.mpr_statut) })
  }
  return { correspondances, nonTrouvees }
}
