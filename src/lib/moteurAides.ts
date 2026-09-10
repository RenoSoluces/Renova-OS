// Moteur d'aides à la rénovation énergétique — façade de compatibilité.
//
// La logique réelle (barème 2026 sourcé, calcul CEE configurable par entreprise) vit dans
// src/lib/aides/. Ce fichier ne fait que garder la même interface publique qu'avant pour ne
// pas casser ProspectWizard.tsx et ProspectsPage.tsx, tout en corrigeant deux problèmes :
//
// 1. Les seuils étaient datés 2024 et implicitement ceux d'Île-de-France appliqués à tout le
//    monde (aucune distinction IDF / hors IDF) — remplacés par le barème 2026 avec les deux
//    grilles (voir src/lib/aides/baremeMaPrimeRenov.ts).
// 2. Le RFR était divisé par le nombre de parts fiscales avant comparaison aux seuils - or
//    les plafonds de ressources ANAH portent sur le RFR total du FOYER, pas sur un RFR par
//    part. Cette division artificielle faisait basculer des foyers dans une catégorie plus
//    favorable qu'ils n'auraient dû l'être. Corrigé : on compare désormais le RFR total.

import {
  determinerProfilMPR,
  ProfilMPR,
  LABEL_PROFIL,
} from './aides/baremeMaPrimeRenov'

export interface CategorieRevenu {
  categorie: 'TresModeste' | 'Modeste' | 'Intermediaire' | 'Aisee'
  label: string
}

export interface AideResultat {
  cee: number
  mpr: number
  total: number
  reste_a_charge: number
  eligible_1euro: boolean
}

const PROFIL_VERS_CATEGORIE: Record<ProfilMPR, CategorieRevenu['categorie']> = {
  bleu: 'TresModeste',
  jaune: 'Modeste',
  violet: 'Intermediaire',
  rose: 'Aisee',
}

// Détecte l'Île-de-France à partir du code postal (départements 75, 77, 78, 91-95)
export function estIleDeFrance(codePostal: string | null | undefined): boolean {
  if (!codePostal || codePostal.length < 2) return false
  const dep = codePostal.slice(0, 2)
  return ['75', '77', '78', '91', '92', '93', '94', '95'].includes(dep)
}

// Détermine la catégorie de revenu MaPrimeRénov' à partir du RFR TOTAL du foyer (pas divisé
// par part), du nombre de personnes du foyer, et de la localisation IDF/hors IDF.
export function determinerCategorieRevenu(
  revenuFiscalTotal: number,
  nbPersonnes: number,
  ileDeFrance: boolean = false
): CategorieRevenu {
  const profil = determinerProfilMPR(revenuFiscalTotal, nbPersonnes, ileDeFrance)
  return {
    categorie: PROFIL_VERS_CATEGORIE[profil],
    label: LABEL_PROFIL[profil],
  }
}

export function eligible1Euro(categorie: string): boolean {
  return categorie === 'TresModeste' || categorie === 'Modeste'
}
