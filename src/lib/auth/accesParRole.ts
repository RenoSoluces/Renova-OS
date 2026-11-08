import type { PageKey } from '../../types'

/**
 * Rubriques accessibles aux rôles à périmètre réduit. Un rôle absent de la table n'est pas limité
 * (direction, responsables, commerciaux) : ses droits sur les données sont réglés côté base.
 */
export const PAGES_PAR_ROLE: Record<string, PageKey[]> = {
  // Confirme les rendez-vous et les ventes : ne voit ni prix, ni commissions, ni dossiers.
  confirmateur: ['confirmations', 'planning'],
  // Centre d'appels : listes d'appels, prospects qu'il traite, agenda.
  teleconseiller: ['dashboard', 'prospection', 'script_call', 'prospects', 'planning', 'a_traiter'],
  // Administratif : monte et suit les dossiers de l'entreprise ; pas de commissions ni de performance.
  adv: ['dashboard', 'prospects', 'dossiers', 'devis', 'documents', 'fiches_techniques', 'suivi_chantier', 'sav', 'planning', 'simulations', 'veille', 'facturation', 'a_traiter'],
}

export const PAGE_ACCUEIL: Record<string, PageKey> = { confirmateur: 'confirmations' }

export const pageAutorisee = (role: string | null | undefined, page: PageKey): boolean => {
  const permises = role ? PAGES_PAR_ROLE[role] : undefined
  return !permises || permises.includes(page) || page === 'parametres'
}

export const pageAccueil = (role: string | null | undefined): PageKey => (role && PAGE_ACCUEIL[role]) || 'dashboard'
