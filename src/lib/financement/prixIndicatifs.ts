// Prix indicatifs de marche par type de travaux, utilises pour estimer un reste a charge
// directement dans la recommandation de travaux, AVANT la creation d'un devis, quand
// aucun produit du catalogue de l'entreprise ne correspond encore a ce geste.
//
// Ce sont des ordres de grandeur (moyennes marche France 2026, pose comprise), pas des
// prix contractuels. Des qu'un produit du catalogue existe pour la categorie concernee,
// c'est TOUJOURS son prix reel qui est utilise a la place (voir estimerFinancement.ts).

export interface PrixIndicatif {
  prixUnitaire: number
  unite: 'm2' | 'forfait'
}

export const PRIX_INDICATIFS_TRAVAUX: Record<string, PrixIndicatif> = {
  combles: { prixUnitaire: 28, unite: 'm2' },
  murs: { prixUnitaire: 130, unite: 'm2' },
  plancher: { prixUnitaire: 45, unite: 'm2' },
  menuiseries: { prixUnitaire: 650, unite: 'm2' },
  pac_air_eau: { prixUnitaire: 11000, unite: 'forfait' },
  pac_air_air: { prixUnitaire: 4500, unite: 'forfait' },
  ballon_thermodynamique: { prixUnitaire: 3800, unite: 'forfait' },
  vmc: { prixUnitaire: 3500, unite: 'forfait' },
}
