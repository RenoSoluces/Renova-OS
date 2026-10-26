import type { PhotovoltaiqueData } from "../../types";

/**
 * Moteur d'estimation photovoltaïque.
 *
 * Ce module donne une ESTIMATION COMMERCIALE de la production et de la rentabilité
 * d'une installation photovoltaïque, à partir de données simples relevées en visite
 * (orientation, inclinaison, surface, masques). Il ne remplace pas une étude technique
 * PVGIS/logiciel bureau d'études, mais permet de donner au client un ordre de grandeur
 * crédible pendant le rendez-vous.
 *
 * Méthode : Production (kWh/an) = Puissance (kWc) × Productible de référence
 * (kWh/kWc/an, dépend de la zone climatique = proxy d'ensoleillement régional)
 * × coefficient d'orientation × coefficient d'inclinaison × coefficient de masques
 * × ratio de performance système (onduleur, câblage, échauffement, salissure).
 *
 * Les tarifs (prix du kWh évité, tarif de rachat du surplus, coût d'installation, barème
 * de la prime à l'autoconsommation) NE SONT PAS codés en dur : ils sont paramétrables
 * depuis la fiche entreprise (Paramètres > Entreprise > Photovoltaïque), car ces valeurs
 * évoluent régulièrement. Des valeurs par défaut raisonnables sont utilisées si l'entreprise
 * n'a pas encore renseigné ses propres tarifs.
 */

// Productible de référence à orientation Sud / inclinaison optimale (~30°), en
// kWh produits par kWc installé et par an. Approximation à partir des cartes
// d'ensoleillement françaises (RTE / ADEME) : le Nord produit ~15-20% de moins
// que le Sud de la France à puissance égale. Cette donnée est un phénomène physique
// stable (contrairement aux tarifs) : elle reste codée en dur.
const PRODUCTIBLE_REFERENCE_PAR_ZONE: Record<string, number> = {
  H1a: 1000, // Nord-Est
  H1b: 980,  // Nord
  H1c: 1020, // Est
  H2a: 1080, // Centre
  H2b: 1150, // Sud-Ouest
  H2c: 1120, // Atlantique
  H2d: 1300, // Corse
  H3: 1350,  // Méditerranée
};
const PRODUCTIBLE_PAR_DEFAUT = 1100;

// Coefficient d'orientation relatif au Sud (=1.0)
const COEFFICIENT_ORIENTATION: Record<string, number> = {
  sud: 1.0,
  sud_est: 0.94,
  sud_ouest: 0.94,
  est: 0.84,
  ouest: 0.84,
  nord_est: 0.65,
  nord_ouest: 0.65,
  nord: 0.55,
};

// Coefficient de masques solaires (ombrage)
const COEFFICIENT_MASQUES: Record<string, number> = {
  aucun: 1.0,
  faible: 0.95,
  moyen: 0.85,
  fort: 0.70,
};

// Ratio de performance système (pertes onduleur, câblage, température, salissure) —
// valeur standard de l'industrie pour une installation résidentielle correctement dimensionnée.
const RATIO_PERFORMANCE = 0.82;

// Surface nécessaire par kWc installé, panneaux modernes ~400-500 Wc (environ 1,8 m²/panneau).
const SURFACE_PAR_KWC = 5.5;

/** Coefficient d'inclinaison relatif à l'inclinaison optimale (30°). */
function coefficientInclinaison(inclinaisonDeg: number | null | undefined): number {
  if (inclinaisonDeg == null) return 0.97; // valeur non renseignée : hypothèse prudente proche de l'optimal
  const ecart = Math.abs(inclinaisonDeg - 30);
  if (ecart <= 5) return 1.0;
  if (ecart <= 15) return 0.97;
  if (ecart <= 25) return 0.92;
  if (ecart <= 40) return 0.85;
  return 0.75; // toiture très plate (< 5°) ou très pentue (> 70°)
}

export interface ParametresTarifairesPV {
  prixAchatEvite: number; // €/kWh évité en autoconsommation
  prixReventeSurplus: number; // €/kWh revendu (obligation d'achat, ≤ 9 kWc)
  coutInstallationParKwc: number; // € TTC posé / kWc, utilisé si aucun produit catalogue n'est fourni
  primeMoins3kwc: number; // €/kWc, total versé sur 5 ans
  prime3a9kwc: number;
  prime9a36kwc: number;
  primePlus36kwc: number;
}

/** Valeurs par défaut si l'entreprise n'a pas encore renseigné ses propres tarifs. */
export const PARAMETRES_PV_PAR_DEFAUT: ParametresTarifairesPV = {
  prixAchatEvite: 0.2016,
  // Obligation d'achat du surplus ≤ 9 kWc depuis le 5 juin 2026 ; la prime à l'autoconsommation est supprimée.
  prixReventeSurplus: 0.011,
  coutInstallationParKwc: 2200,
  primeMoins3kwc: 0,
  prime3a9kwc: 0,
  prime9a36kwc: 0,
  primePlus36kwc: 0,
};

export interface ResultatSimulationPV {
  puissanceInstallee: number; // kWc retenus pour le calcul
  surfaceNecessaire: number; // m²
  productionAnnuelle: number; // kWh/an
  productibleUnitaire: number; // kWh/kWc/an, après tous coefficients
  tauxAutoconsommation: number; // 0-1
  energieAutoconsommee: number; // kWh/an
  energieRevendue: number; // kWh/an
  economieAutoconsommation: number; // €/an
  revenuRevente: number; // €/an
  gainAnnuelTotal: number; // €/an
  investissementEstime: number; // € TTC avant aides
  coutParKwcUtilise: number; // € — issu du catalogue si fourni, sinon des paramètres entreprise
  primeAutoconsommation: number; // € (versée sur 5 ans, montant total ici)
  investissementNet: number; // € après prime
  dureeAmortissementAnnees: number | null;
  alerteSurfaceInsuffisante: boolean;
  alerteMasquesImportants: boolean;
}

/** Barème de la prime à l'autoconsommation (dégressif par tranche de puissance, versé sur 5
 * ans ; le montant retourné est le total cumulé sur 5 ans). */
function primeAutoconsommation(puissanceKwc: number, avecRevente: boolean, params: ParametresTarifairesPV): number {
  if (!avecRevente || puissanceKwc <= 0) return 0;
  if (puissanceKwc <= 3) return puissanceKwc * params.primeMoins3kwc;
  if (puissanceKwc <= 9) return puissanceKwc * params.prime3a9kwc;
  if (puissanceKwc <= 36) return puissanceKwc * params.prime9a36kwc;
  return puissanceKwc * params.primePlus36kwc;
}

export function simulerPhotovoltaique(
  data: PhotovoltaiqueData,
  zoneClimatique: string,
  parametresTarifaires: ParametresTarifairesPV = PARAMETRES_PV_PAR_DEFAUT,
  /** Prix HT/kWc issu du catalogue produits (categorie 'photovoltaique'), s'il existe —
   * permet de refléter le vrai coût des panneaux vendus par l'entreprise plutôt qu'une
   * moyenne de marché. Le prix HT est converti en TTC (TVA réduite 10% pour le PV résidentiel). */
  prixCatalogueParKwcHT?: number | null
): ResultatSimulationPV {
  // Puissance retenue : celle exprimée par le client si renseignée, sinon déduite de la
  // surface de toiture disponible.
  const puissanceDepuisSurface = data.surface_disponible_m2
    ? Math.round((data.surface_disponible_m2 / SURFACE_PAR_KWC) * 10) / 10
    : null;
  const puissanceInstallee = data.puissance_souhaitee_kwc || puissanceDepuisSurface || 3;

  const surfaceNecessaire = Math.round(puissanceInstallee * SURFACE_PAR_KWC * 10) / 10;
  const alerteSurfaceInsuffisante = !!(
    data.surface_disponible_m2 && surfaceNecessaire > data.surface_disponible_m2 * 1.05
  );

  const productibleReference = PRODUCTIBLE_REFERENCE_PAR_ZONE[zoneClimatique] || PRODUCTIBLE_PAR_DEFAUT;
  const coeffOrientation = COEFFICIENT_ORIENTATION[data.orientation_toiture] ?? 0.9;
  const coeffInclinaison = coefficientInclinaison(data.inclinaison_deg);
  const coeffMasques = COEFFICIENT_MASQUES[data.masques_solaires] ?? 0.95;

  const productibleUnitaire = Math.round(
    productibleReference * coeffOrientation * coeffInclinaison * coeffMasques * RATIO_PERFORMANCE
  );
  const productionAnnuelle = Math.round(puissanceInstallee * productibleUnitaire);

  // Taux d'autoconsommation : approximation usuelle du secteur selon le mode d'usage choisi.
  // Sans stockage, un foyer autoconsomme typiquement 25 à 40% de sa production (le pic de
  // production solaire ne coïncide pas avec le pic de consommation domestique) ; une batterie
  // permet de remonter ce taux à 60-75%.
  let tauxAutoconsommation: number;
  switch (data.usage_souhaite) {
    case "revente_totale":
      tauxAutoconsommation = 0;
      break;
    case "autoconsommation_batterie":
      tauxAutoconsommation = 0.65;
      break;
    case "autoconsommation_revente_surplus":
    default:
      tauxAutoconsommation = 0.35;
      break;
  }
  // Si la consommation annuelle du foyer est connue et inférieure à la production, on plafonne
  // le taux d'autoconsommation de façon réaliste (on ne peut pas autoconsommer plus qu'on ne consomme).
  if (data.consommation_annuelle_kwh && productionAnnuelle > 0) {
    const plafond = Math.min(1, data.consommation_annuelle_kwh / productionAnnuelle);
    tauxAutoconsommation = Math.min(tauxAutoconsommation, plafond + 0.1);
  }

  const energieAutoconsommee = Math.round(productionAnnuelle * tauxAutoconsommation);
  const energieRevendue = productionAnnuelle - energieAutoconsommee;

  const economieAutoconsommation = Math.round(energieAutoconsommee * parametresTarifaires.prixAchatEvite);
  const revenuRevente = data.usage_souhaite === "autoconsommation_batterie"
    ? 0 // en mode autoconsommation + batterie, on considère le surplus stocké, pas revendu
    : Math.round(energieRevendue * parametresTarifaires.prixReventeSurplus);
  const gainAnnuelTotal = economieAutoconsommation + revenuRevente;

  // TVA à 10% pour une installation photovoltaïque résidentielle ≤ 3 kWc (taux réduit
  // rénovation énergétique) ; au-delà, TVA à 20%. Approximation commerciale du taux applicable.
  const tvaApplicable = puissanceInstallee <= 3 ? 1.10 : 1.20;
  const coutParKwcUtilise = prixCatalogueParKwcHT
    ? Math.round(prixCatalogueParKwcHT * tvaApplicable)
    : parametresTarifaires.coutInstallationParKwc;

  const investissementEstime = Math.round(puissanceInstallee * coutParKwcUtilise);
  const eligiblePrime = data.usage_souhaite !== "revente_totale";
  const prime = Math.round(primeAutoconsommation(puissanceInstallee, eligiblePrime, parametresTarifaires));
  const investissementNet = Math.max(0, investissementEstime - prime);
  const dureeAmortissementAnnees = gainAnnuelTotal > 0
    ? Math.round((investissementNet / gainAnnuelTotal) * 10) / 10
    : null;

  return {
    puissanceInstallee,
    surfaceNecessaire,
    productionAnnuelle,
    productibleUnitaire,
    tauxAutoconsommation,
    energieAutoconsommee,
    energieRevendue,
    economieAutoconsommation,
    revenuRevente,
    gainAnnuelTotal,
    investissementEstime,
    coutParKwcUtilise,
    primeAutoconsommation: prime,
    investissementNet,
    dureeAmortissementAnnees,
    alerteSurfaceInsuffisante,
    alerteMasquesImportants: data.masques_solaires === "fort",
  };
}

