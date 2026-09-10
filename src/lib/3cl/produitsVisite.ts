import type { TypeTravaux } from './analyse/calculGainTravaux'

/**
 * Un produit sélectionnable pour une "visite technique ciblée" (par opposition
 * à l'audit complet en 9 sections). Chaque produit est aligné sur un type de
 * travaux du moteur 3CL (pour le calcul de gain) et n'exige que les sections
 * d'audit strictement nécessaires à ce geste — en plus de l'identification du
 * client et des données générales du bâtiment, toujours indispensables.
 */
export interface ProduitVisite {
  id: TypeTravaux | 'photovoltaique'
  label: string
  description: string
  /** Sections du wizard (voir SECTIONS dans VisiteTechniqueWizard) requises en plus de 1 (Identification) et 2 (Bâtiment) */
  sectionsSupplementaires: number[]
  /** Catégorie utilisée côté devis / catalogue produits */
  categorieDevis: string
}

export const PRODUITS_VISITE: ProduitVisite[] = [
  {
    id: 'combles',
    label: 'Isolation des combles / toitures',
    description: "Audit ciblé sur l'isolation du plafond ou de la toiture (combles perdus, rampants).",
    sectionsSupplementaires: [6],
    categorieDevis: 'combles',
  },
  {
    id: 'murs',
    label: 'Isolation des murs',
    description: "Audit ciblé sur l'isolation des murs donnant sur l'extérieur (ITI ou ITE).",
    sectionsSupplementaires: [3],
    categorieDevis: 'murs',
  },
  {
    id: 'plancher',
    label: 'Isolation du plancher bas',
    description: "Audit ciblé sur l'isolation du plancher bas (sous-sol, vide sanitaire).",
    sectionsSupplementaires: [5],
    categorieDevis: 'plancher',
  },
  {
    id: 'menuiseries',
    label: 'Menuiseries (fenêtres, portes-fenêtres)',
    description: 'Audit ciblé sur le remplacement des menuiseries extérieures.',
    sectionsSupplementaires: [4],
    categorieDevis: 'menuiseries',
  },
  {
    id: 'pac',
    label: 'Pompe à chaleur / chaudière biomasse',
    description: "Audit ciblé sur le remplacement du système de chauffage principal (PAC air/eau, chaudière biomasse...).",
    sectionsSupplementaires: [8],
    categorieDevis: 'pac_air_eau',
  },
  {
    id: 'pac_air_air',
    label: 'Pompe à chaleur air/air (climatisation réversible)',
    description: 'Audit ciblé sur la mise en place de PAC air/air en remplacement du chauffage électrique direct.',
    sectionsSupplementaires: [8],
    categorieDevis: 'pac_air_air',
  },
  {
    id: 'ballon_thermodynamique',
    label: "Eau chaude sanitaire (ballon thermodynamique, solaire)",
    description: "Audit ciblé sur le système de production d'eau chaude sanitaire.",
    sectionsSupplementaires: [9],
    categorieDevis: 'ballon_thermodynamique',
  },
  {
    id: 'vmc',
    label: 'Ventilation (VMC)',
    description: 'Audit ciblé sur le renouvellement du système de ventilation.',
    sectionsSupplementaires: [7],
    categorieDevis: 'vmc',
  },
  {
    id: 'photovoltaique',
    label: 'Panneaux photovoltaïques',
    description: "Audit ciblé sur l'installation de panneaux solaires photovoltaïques (production d'électricité).",
    sectionsSupplementaires: [10],
    categorieDevis: 'photovoltaique',
  },
]

export function produitVisiteById(id: string | null | undefined): ProduitVisite | undefined {
  return PRODUITS_VISITE.find(p => p.id === id)
}

/** Sections d'audit actives pour une visite donnée : 1 et 2 toujours, + celles du produit ciblé si applicable. */
export function sectionsPourVisite(typeVisite: string | undefined, produitCible: string | null | undefined): number[] {
  if (typeVisite !== 'produit') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const produit = produitVisiteById(produitCible)
  if (!produit) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return [1, 2, ...produit.sectionsSupplementaires]
}
