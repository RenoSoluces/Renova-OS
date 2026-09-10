export interface LigneCalculable {
  quantite: number;
  prix_unitaire_ht: number;
  tva_taux: number;
}

export interface TotauxDevis {
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
}

export function calculMontantLigneHT(ligne: LigneCalculable): number {
  return Math.round(ligne.quantite * ligne.prix_unitaire_ht * 100) / 100;
}

export function calculTotauxDevis(lignes: LigneCalculable[]): TotauxDevis {

  let montantHT = 0;
  let montantTVA = 0;

  for (const ligne of lignes) {
    const ht = calculMontantLigneHT(ligne);
    montantHT += ht;
    montantTVA += ht * (ligne.tva_taux / 100);
  }

  return {
    montantHT: Math.round(montantHT * 100) / 100,
    montantTVA: Math.round(montantTVA * 100) / 100,
    montantTTC: Math.round((montantHT + montantTVA) * 100) / 100,
  };

}

export function calculResteACharge(
  montantTTC: number,
  aides: { montant: number }[]
): number {
  const totalAides = aides.reduce((s, a) => s + a.montant, 0);
  return Math.max(0, Math.round((montantTTC - totalAides) * 100) / 100);
}

// Correspondance entre une catégorie du catalogue produits et un geste MaPrimeRénov' /
// un geste CEE, pour proposer automatiquement le calcul d'aide adapté à la ligne de devis.
export const CATEGORIE_VERS_GESTE_MPR: Record<string, string> = {
  pac_air_eau: "pac_air_eau",
  pac_geothermie: "pac_geothermie",
  ballon_thermodynamique: "ballon_thermodynamique",
  combles: "isolation_combles_amenages",
  menuiseries: "menuiseries_simple_vitrage",
  vmc: "vmc_double_flux",
  // murs : plus éligible au parcours par geste depuis 2026 (uniquement rénovation d'ampleur)
  // plancher : non couvert par le barème mono-geste actuel (voir avertissement du module)
};

export const CATEGORIE_VERS_GESTE_CEE: Record<string, string> = {
  pac_air_eau: "pac_air_eau",
  combles: "isolation_combles",
  murs: "isolation_murs",
  menuiseries: "menuiseries",
  vmc: "vmc",
  ballon_thermodynamique: "ballon_thermodynamique",
};
