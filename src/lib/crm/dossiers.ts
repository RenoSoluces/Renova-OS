export interface DossierStatut { value: string; label: string; badge: string }

export const DOSSIER_STATUTS: DossierStatut[] = [
  { value: 'creation', label: 'En création', badge: 'badge-neutral' },
  { value: 'pieces_manquantes', label: 'Pièces manquantes', badge: 'badge-warning' },
  { value: 'depose', label: 'Déposé', badge: 'badge-info' },
  { value: 'instruction', label: 'En instruction', badge: 'badge-info' },
  { value: 'accepte', label: 'Accepté', badge: 'badge-success' },
  { value: 'refuse', label: 'Refusé', badge: 'badge-error' },
]

export function dossierStatutLabel(s: string | null | undefined): DossierStatut {
  return DOSSIER_STATUTS.find(d => d.value === s) || DOSSIER_STATUTS[0]
}

// Checklist type par défaut créée avec chaque nouveau dossier de rénovation énergétique.
export const CHECKLIST_PIECES: { type: string; nom: string }[] = [
  { type: 'avis_imposition', nom: "Avis d’impôts (avis d’imposition)" },
  { type: 'taxe_fonciere', nom: 'Taxe foncière' },
  { type: 'piece_identite', nom: 'Carte nationale d’identité (CNI)' },
  { type: 'justificatif_domicile', nom: 'Justificatif de domicile' },
  { type: 'photos', nom: 'Photos avant travaux' },
]
