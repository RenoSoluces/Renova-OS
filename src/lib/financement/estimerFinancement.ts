import type { Batiment3CL } from '../3cl/batiment3CL'
import type { Prospect, Produit } from '../../types'
import { produitVisiteById } from '../3cl/produitsVisite'
import { estimerQuantiteTravaux } from '../3cl/analyse/estimerQuantiteTravaux'
import { prixProduitPourZone } from '../catalogue/prixParZone'
import { PRIX_INDICATIFS_TRAVAUX } from './prixIndicatifs'
import { calculAideMPR, determinerProfilMPR, GesteMPR } from '../aides/baremeMaPrimeRenov'
import { estimerPrimeCEE } from '../aides/calculAidesCEE'
import { CATEGORIE_VERS_GESTE_MPR, CATEGORIE_VERS_GESTE_CEE } from '../devis/calculDevis'
import { estIleDeFrance } from '../moteurAides'

export interface EstimationFinancement {
  montantTravauxHT: number
  sourcePrix: 'catalogue' | 'indicatif' | 'inconnu'
  aideMPR: number
  aideCEE: number
  totalAides: number
  resteACharge: number
  profilConnu: boolean
  avertissement: string | null
}

/**
 * Estime le coût, les aides mobilisables et le reste à charge pour un geste de travaux
 * donné (identifié par sa `categorieDevis`, ex: 'combles', 'pac_air_eau'...), directement
 * depuis la recommandation de la visite technique — sans avoir à créer un devis complet.
 *
 * Priorité de prix : produit du catalogue de l'entreprise (avec dérogation de zone si
 * applicable) > prix indicatif de marché (à défaut). Les aides MaPrimeRénov' ne sont
 * calculées que si le profil de ressources du foyer est connu (RFR + nombre de personnes
 * renseignés sur la fiche prospect) ; sinon un avertissement l'indique clairement.
 */
export function estimerFinancementTravaux(
  categorieDevis: string,
  batiment: Batiment3CL,
  prospect: Prospect | null | undefined,
  produitsCatalogue: Produit[],
  tauxCeeEurParMwhCumac: number
): EstimationFinancement {
  // --- 1. Coût des travaux ---
  const candidatsCatalogue = produitsCatalogue
    .filter(p => p.actif && p.categorie === categorieDevis)
    .sort((a, b) => a.prix_unitaire_ht - b.prix_unitaire_ht)
  const produitCatalogue = candidatsCatalogue[0] || null

  const prixIndicatif = PRIX_INDICATIFS_TRAVAUX[categorieDevis]
  const unite = produitCatalogue?.unite || prixIndicatif?.unite || 'forfait'
  const quantite = unite === 'm2' ? estimerQuantiteTravaux(categorieDevis, batiment) : 1

  let prixUnitaire = 0
  let sourcePrix: EstimationFinancement['sourcePrix'] = 'inconnu'
  if (produitCatalogue) {
    prixUnitaire = prixProduitPourZone(produitCatalogue, prospect?.code_postal)
    sourcePrix = 'catalogue'
  } else if (prixIndicatif) {
    prixUnitaire = prixIndicatif.prixUnitaire
    sourcePrix = 'indicatif'
  }
  const montantTravauxHT = Math.round(prixUnitaire * quantite)

  // --- 2. Aide MaPrimeRénov' (nécessite le profil de ressources du foyer) ---
  let aideMPR = 0
  const profilConnu = !!(prospect?.rfr && prospect?.nombre_personnes_foyer)
  const gesteMPR = CATEGORIE_VERS_GESTE_MPR[categorieDevis] as GesteMPR | undefined
  if (profilConnu && gesteMPR && montantTravauxHT > 0) {
    const idf = prospect?.zone_ile_de_france ?? estIleDeFrance(prospect?.code_postal)
    const profil = determinerProfilMPR(prospect!.rfr!, prospect!.nombre_personnes_foyer, idf)
    const resultat = calculAideMPR(gesteMPR, profil, montantTravauxHT, quantite)
    aideMPR = resultat.montant
  }

  // --- 3. Aide CEE (estimation indicative, taux propre à l'entreprise) ---
  let aideCEE = 0
  const gesteCEE = CATEGORIE_VERS_GESTE_CEE[categorieDevis]
  if (gesteCEE && montantTravauxHT > 0) {
    aideCEE = estimerPrimeCEE(gesteCEE, quantite, tauxCeeEurParMwhCumac).montantEstime
  }

  const totalAides = aideMPR + aideCEE
  const resteACharge = Math.max(0, montantTravauxHT - totalAides)

  let avertissement: string | null = null
  if (sourcePrix === 'inconnu') {
    avertissement = "Aucun prix disponible (catalogue ou indicatif) pour ce geste — ajoutez un produit de cette catégorie au catalogue."
  } else if (sourcePrix === 'indicatif') {
    avertissement = "Prix indicatif de marché (aucun produit correspondant dans votre catalogue) — à ajuster."
  }
  if (!profilConnu && gesteMPR) {
    avertissement = [avertissement, "Profil de ressources du foyer non renseigné : montant MaPrimeRénov' non calculé."].filter(Boolean).join(' ')
  }

  return {
    montantTravauxHT,
    sourcePrix,
    aideMPR,
    aideCEE,
    totalAides,
    resteACharge,
    profilConnu,
    avertissement,
  }
}
