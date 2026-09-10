import type { Produit } from '../../types'

/** Extrait le prefixe de zone (departement) d'un code postal : 2 chiffres pour la
 * metropole, 3 pour les departements et collectivites d'outre-mer (97x, 98x). */
export function departementDepuisCodePostal(codePostal: string | null | undefined): string | null {
  if (!codePostal) return null
  const cp = codePostal.trim()
  if (!/^\d{5}$/.test(cp)) return null
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3)
  return cp.slice(0, 2)
}

/**
 * Retourne le prix HT applicable pour un produit donne, en tenant compte des
 * derogations tarifaires par zone geographique (zones_prix) si le code postal du
 * prospect correspond a l'une d'elles ; sinon le prix de base du catalogue.
 */
export function prixProduitPourZone(produit: Produit, codePostalProspect: string | null | undefined): number {
  const departement = departementDepuisCodePostal(codePostalProspect)
  if (!departement || !produit.zones_prix || produit.zones_prix.length === 0) return produit.prix_unitaire_ht

  const derogation = produit.zones_prix.find(z => z.zone === departement)
  return derogation ? derogation.prix_unitaire_ht : produit.prix_unitaire_ht
}
