// ============================================================================
// CEE — Certificats d'Économies d'Énergie
// ============================================================================
// ⚠️ Contrairement à MaPrimeRénov' (barème national fixe), le montant réel d'une prime CEE
// dépend de DEUX éléments propres à chaque entreprise et qu'aucun barème public ne fixe :
//
// 1. Le kWh cumac exact du geste, calculé selon la "fiche d'opération standardisée"
//    officielle correspondante (ex: BAR-EN-101 pour l'isolation de combles, BAR-TH-104 pour
//    une PAC...). Chaque fiche a sa propre formule (fonction de la surface, de la puissance,
//    de la zone climatique, du type de bâtiment...) publiée par l'ADEME/PNCEE.
// 2. Le prix du kWh cumac (€/MWh cumac) : NON réglementé, négocié librement entre chaque
//    entreprise RGE et son "délégataire" CEE (obligé ou éligible). Ce prix fluctue sur un
//    marché (bourse EMMY) et varie couramment de 4 à 9 €/MWh cumac selon les périodes et
//    les contrats — parfois plus en période de "coup de pouce".
//
// CE MODULE NE PEUT DONC PAS DONNER DE MONTANT CEE FIABLE "PRÊT À L'EMPLOI" COMME POUR
// MAPRIMERÉNOV'. Il fournit une ESTIMATION configurable :
// - Le prix €/MWh cumac est un réglage par entreprise (`entreprises.taux_cee_eur_par_mwh_cumac`),
//   à saisir par l'entreprise elle-même selon son contrat réel avec son délégataire.
// - Les coefficients de kWh cumac ci-dessous sont des ORDRES DE GRANDEUR typiques pour un
//   cas standard (maison individuelle, zone climatique moyenne, sur 5 ans de durée de vie
//   conventionnelle), PAS le calcul exact de la fiche officielle. Pour un montant CEE
//   contractuel exact, il faut le calcul officiel de la fiche ADEME correspondante.
// ============================================================================

export interface CoefficientCEE {
  gesteId: string;
  nom: string;
  ficheReference: string;
  // MWh cumac par unité (m² pour isolation, forfait pour équipement) — ordre de grandeur
  mwhCumacParUnite: number;
  unite: "forfait" | "m2";
  note: string;
}

// Ordres de grandeur indicatifs — cas standard maison individuelle, à ajuster avec la fiche
// officielle exacte pour un calcul contractuel.
export const COEFFICIENTS_CEE_INDICATIFS: CoefficientCEE[] = [
  {
    gesteId: "isolation_combles",
    nom: "Isolation combles / rampants",
    ficheReference: "BAR-EN-101 / BAR-EN-102",
    mwhCumacParUnite: 0.6,
    unite: "m2",
    note: "Formule officielle réelle fonction de la zone climatique et du type d'énergie de chauffage remplacée",
  },
  {
    gesteId: "isolation_murs",
    nom: "Isolation des murs",
    ficheReference: "BAR-EN-103",
    mwhCumacParUnite: 0.45,
    unite: "m2",
    note: "Formule officielle réelle fonction de la zone climatique",
  },
  {
    gesteId: "pac_air_eau",
    nom: "Pompe à chaleur Air/Eau",
    ficheReference: "BAR-TH-104",
    mwhCumacParUnite: 55,
    unite: "forfait",
    note: "Formule officielle réelle fonction de la puissance et de la zone climatique",
  },
  {
    gesteId: "menuiseries",
    nom: "Remplacement de menuiseries",
    ficheReference: "BAR-EN-104",
    mwhCumacParUnite: 3.5,
    unite: "m2",
    note: "Formule officielle réelle fonction de la zone climatique et du type de vitrage remplacé",
  },
  {
    gesteId: "vmc",
    nom: "VMC Double Flux",
    ficheReference: "BAR-TH-127",
    mwhCumacParUnite: 18,
    unite: "forfait",
    note: "Formule officielle réelle fonction de la surface ventilée",
  },
  {
    gesteId: "ballon_thermodynamique",
    nom: "Chauffe-eau thermodynamique",
    ficheReference: "BAR-TH-148",
    mwhCumacParUnite: 22,
    unite: "forfait",
    note: "Formule officielle réelle fonction du volume du ballon",
  },
];

export function estimerPrimeCEE(
  gesteId: string,
  quantite: number,
  tauxEurParMwhCumac: number
): { montantEstime: number; coefficient: CoefficientCEE | undefined; avertissement: string } {

  const coefficient =
    COEFFICIENTS_CEE_INDICATIFS.find(c => c.gesteId === gesteId);

  if (!coefficient) {
    return {
      montantEstime: 0,
      coefficient: undefined,
      avertissement: "Geste non couvert par les coefficients CEE indicatifs — calcul manuel requis avec la fiche officielle.",
    };
  }

  const mwhCumac =
    coefficient.unite === "m2"
      ? coefficient.mwhCumacParUnite * quantite
      : coefficient.mwhCumacParUnite;

  const montantEstime =
    Math.round(mwhCumac * tauxEurParMwhCumac);

  return {
    montantEstime,
    coefficient,
    avertissement: `Estimation indicative (fiche ${coefficient.ficheReference}) — à confirmer avec le calcul exact de la fiche officielle et le taux contractuel réel du délégataire.`,
  };

}
