import type { Batiment3CL } from '../batiment3CL'

// Estime une quantite realiste pour une ligne de devis (ou une estimation de financement)
// a partir des surfaces deja saisies pendant l'audit (m2 pour les postes d'isolation,
// forfait/unite pour les equipements).
export function estimerQuantiteTravaux(typeTravaux: string, batiment: Batiment3CL): number {
  switch (typeTravaux) {
    case 'combles':
      return Math.round(batiment.toitures.reduce((s, t) => s + (t.surface || 0), 0) * 100) / 100 || 1
    case 'murs':
      return Math.round(batiment.murs.reduce((s, m) => s + (m.surface || 0), 0) * 100) / 100 || 1
    case 'plancher':
      return Math.round(batiment.planchers.reduce((s, p) => s + (p.surface || 0), 0) * 100) / 100 || 1
    case 'menuiseries':
      return Math.round(batiment.menuiseries.reduce((s, m) => s + (m.surface || 0), 0) * 100) / 100 || 1
    default:
      return 1
  }
}
