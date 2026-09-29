export interface LigneCalculable {
  quantite: number;
  prix_unitaire_ht: number;
  tva_taux: number;
}

export interface TotauxDevis {
  montantHTAvantRemise: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  remiseHT: number;
}

export type RemiseType = 'montant' | 'pourcentage';

export function calculMontantLigneHT(ligne: LigneCalculable): number {
  return Math.round(ligne.quantite * ligne.prix_unitaire_ht * 100) / 100;
}

export function calculTotauxDevis(
  lignes: LigneCalculable[],
  remiseValeur = 0,
  remiseType: RemiseType = 'montant'
): TotauxDevis {
  let montantHTAvantRemise = 0;
  const tvaParLigne: number[] = [];

  for (const ligne of lignes) {
    const ht = calculMontantLigneHT(ligne);
    montantHTAvantRemise += ht;
    tvaParLigne.push(ht * (ligne.tva_taux / 100));
  }

  montantHTAvantRemise = Math.round(montantHTAvantRemise * 100) / 100;
  const remiseHT = remiseType === 'pourcentage'
    ? montantHTAvantRemise * Math.min(Math.max(remiseValeur, 0), 100) / 100
    : Math.min(Math.max(remiseValeur, 0), montantHTAvantRemise);
  const remiseArrondie = Math.round(remiseHT * 100) / 100;
  const tauxRemise = montantHTAvantRemise > 0 ? remiseArrondie / montantHTAvantRemise : 0;
  const montantHT = Math.max(0, Math.round((montantHTAvantRemise - remiseArrondie) * 100) / 100);
  const montantTVA = Math.round(tvaParLigne.reduce((sum, tva) => sum + tva * (1 - tauxRemise), 0) * 100) / 100;

  return {
    montantHTAvantRemise,
    montantHT,
    montantTVA,
    montantTTC: Math.round((montantHT + montantTVA) * 100) / 100,
    remiseHT: remiseArrondie,
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
