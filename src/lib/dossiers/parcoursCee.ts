/**
 * Parcours d'un dossier CEE / rénovation : une étape courante et un statut propre à cette étape.
 * Calqué sur les parcours des CRM du marché (Prospection → … → CEE payé).
 */
export interface EtapeParcours {
  id: string
  label: string
  statuts: string[]
  /** gagné : fin heureuse du parcours ; perdu : dossier abandonné. */
  objectif?: 'gagne' | 'perdu'
}

export const PARCOURS_CEE: EtapeParcours[] = [
  { id: 'prospection', label: 'Prospection', statuts: ['A faire', 'En cours', 'Effectué'] },
  { id: 'rdv', label: 'RDV', statuts: ['RDV à prendre', 'À planifier', 'Planifié', 'Effectué'] },
  { id: 'audit', label: 'Audit', statuts: ['À faire', 'En cours', 'En attente du rapport', 'Effectué'] },
  { id: 'devis', label: 'Devis', statuts: ['À faire', 'Envoyé', 'En attente de signature', 'Signé', 'Signé en électronique', 'Refus'] },
  { id: 'cofrac1', label: 'Cofrac 1', statuts: ['À planifier', 'Planifié', 'Effectué', 'À refaire', 'Non conforme'] },
  { id: 'installation', label: 'Installation', statuts: ['À planifier', 'En cours', 'Installation à finir', 'Fin de l\'installation à finir', 'Terminée'] },
  { id: 'cofrac2', label: 'Cofrac 2', statuts: ['À planifier', 'Planifié', 'Effectué', 'À refaire', 'Non conforme'] },
  { id: 'dossier_cee', label: 'Dossier CEE', statuts: ['En attente de documents', 'À envoyer', 'Envoyé', 'Incomplet', 'Retour à traiter', 'Complet'] },
  { id: 'aff_cee', label: 'AFF CEE', statuts: ['En cours', 'Envoyé', 'Retour à traiter', 'Complet'] },
  { id: 'cee_paye', label: 'CEE payé', statuts: ['Facture envoyée', 'Payé'], objectif: 'gagne' },
  { id: 'annule', label: 'Annulé', statuts: ['Refus', 'Rétractation', 'Le client ne veut pas donner suite', 'Non conforme'], objectif: 'perdu' },
]

export const etapeParcours = (id?: string | null): EtapeParcours | undefined => PARCOURS_CEE.find(e => e.id === id)

/** Index de l'étape dans le parcours (-1 si inconnue). */
export const indexEtape = (id?: string | null): number => PARCOURS_CEE.findIndex(e => e.id === id)

/** Un statut est valide s'il appartient à l'étape donnée (ou s'il est vide). */
export const statutValide = (etape: string, statut: string | null | undefined): boolean =>
  !statut || (etapeParcours(etape)?.statuts.includes(statut) ?? false)

/** Libellé court « Étape · statut » pour les listes. */
export const libelleParcours = (etape?: string | null, statut?: string | null): string => {
  const e = etapeParcours(etape)
  if (!e) return '—'
  return statut ? `${e.label} · ${statut}` : e.label
}
