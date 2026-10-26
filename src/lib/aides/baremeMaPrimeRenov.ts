// ============================================================================
// BARÈME MAPRIMERÉNOV' — Parcours par geste (mono-geste)
// ============================================================================
// Dernière vérification : 17/08/2026, sources croisées (economie.gouv.fr, service-public.fr
// article F35083, ANAH, décret n° 2025-956 du 8 septembre 2025 — réforme du 30/09/2025).
//
// ⚠️ AVERTISSEMENT IMPORTANT — À LIRE AVANT TOUTE UTILISATION COMMERCIALE
// Les barèmes d'aides publiques changent fréquemment (au moins une fois par an, parfois en
// cours d'année comme la réforme de septembre 2025 ou la suspension/réouverture du guichet
// début 2026). Les montants ci-dessous sont une base de travail sourcée à la date indiquée,
// PAS une garantie contractuelle. Avant d'engager un client sur un montant d'aide précis :
// 1. Vérifier le montant exact sur le simulateur officiel france-renov.gouv.fr/bareme
// 2. Ne jamais présenter un montant d'aide comme acquis avant validation du dossier par
//    l'Anah (l'aide est versée après travaux, sur present de facture, pas un crédit d'impôt)
// Ce module DOIT être révisé à chaque changement de barème. La date "derniereMiseAJour"
// ci-dessous doit être mise à jour à chaque modification pour tracer la fraîcheur des données.
// ============================================================================

export const DERNIERE_MISE_A_JOUR_BAREME_MPR = "2026-08-17";

export type ProfilMPR = "bleu" | "jaune" | "violet" | "rose";

export const LABEL_PROFIL: Record<ProfilMPR, string> = {
  bleu: "Très modeste",
  jaune: "Modeste",
  violet: "Intermédiaire",
  rose: "Supérieur",
};

// Plafonds de Revenu Fiscal de Référence (RFR) par taille de foyer.
// Source hors IDF : tableau ANAH 2026 (concordant hellio.com / velux.fr / primesenergie.fr).
// Source IDF (1 personne uniquement, confirmée) : primesenergie.fr, 2026.
// IDF pour 2 à 5+ personnes : ESTIMÉ par extrapolation du même ratio IDF/hors-IDF que pour
// 1 personne (~+38%) faute de source directe vérifiée pour ces lignes — À VÉRIFIER avant
// utilisation sur un dossier réel en Île-de-France.
export interface PlafondRessources {
  personnes: number;
  bleu: number;
  jaune: number;
  violet: number;
}

export const PLAFONDS_HORS_IDF: PlafondRessources[] = [
  { personnes: 1, bleu: 17363, jaune: 22259, violet: 31185 },
  { personnes: 2, bleu: 25393, jaune: 32553, violet: 45842 },
  { personnes: 3, bleu: 30540, jaune: 39148, violet: 55196 },
  { personnes: 4, bleu: 35676, jaune: 45735, violet: 64550 },
  { personnes: 5, bleu: 40835, jaune: 52353, violet: 73909 },
];

// ⚠️ Estimé par extrapolation — voir avertissement ci-dessus
export const PLAFONDS_IDF: PlafondRessources[] = [
  { personnes: 1, bleu: 24031, jaune: 29253, violet: 40851 },
  { personnes: 2, bleu: 35244, jaune: 42848, violet: 59981 }, // estimé
  { personnes: 3, bleu: 42351, jaune: 51503, violet: 72101 }, // estimé
  { personnes: 4, bleu: 49489, jaune: 60177, violet: 84274 }, // estimé
  { personnes: 5, bleu: 56643, jaune: 68873, violet: 96475 }, // estimé
];

function plafondPourFoyer(personnes: number, idf: boolean): PlafondRessources {
  const table = idf ? PLAFONDS_IDF : PLAFONDS_HORS_IDF;
  const n = Math.max(1, Math.min(5, Math.round(personnes)));
  const base = table.find(p => p.personnes === n)!;
  if (personnes <= 5) return base;
  // Au-delà de 5 personnes : majoration par personne supplémentaire (~5 200€ hors IDF,
  // ~7 200€ IDF, ordre de grandeur cohérent avec l'écart observé entre les paliers).
  const majorationParPersonne = idf ? 7200 : 5200;
  const supplement = (personnes - 5) * majorationParPersonne;
  return {
    personnes,
    bleu: base.bleu + supplement,
    jaune: base.jaune + supplement,
    violet: base.violet + supplement,
  };
}

export function determinerProfilMPR(
  revenuFiscalReference: number,
  nombrePersonnesFoyer: number,
  ileDeFrance: boolean
): ProfilMPR {
  const plafond = plafondPourFoyer(nombrePersonnesFoyer, ileDeFrance);
  if (revenuFiscalReference <= plafond.bleu) return "bleu";
  if (revenuFiscalReference <= plafond.jaune) return "jaune";
  if (revenuFiscalReference <= plafond.violet) return "violet";
  return "rose";
}

// ----------------------------------------------------------------------------
// Montants par geste — parcours par geste (mono-geste), profil Rose EXCLU depuis le
// 01/01/2026 (réforme). Isolation des murs (ITI/ITE) EXCLUE du parcours par geste depuis
// le 01/01/2026 (renvoyée vers le parcours rénovation d'ampleur uniquement).
// ----------------------------------------------------------------------------

export type GesteMPR =
  | "pac_air_eau"
  | "pac_geothermie"
  | "pac_hybride"
  | "poele_granules"
  | "ballon_thermodynamique"
  | "isolation_combles_amenages" // rampants / plafonds de combles aménagés — €/m²
  | "isolation_combles_perdus" // combles perdus — €/m²
  | "menuiseries_simple_vitrage" // remplacement de simple vitrage uniquement — forfait/équipement
  | "vmc_double_flux";

export interface BaremeGeste {
  id: GesteMPR;
  nom: string;
  // montant fixe (€) OU montant au m²/équipement selon `unite`
  montants: Partial<Record<ProfilMPR, number>>;
  unite: "forfait" | "m2" | "equipement";
  plafondDepenseEligible: number; // € HT, ou €/m² si unite = m2
  conditionsTechniques: string;
  eligibleParcoursGeste: boolean;
  note?: string;
}

export const BAREME_GESTES_MPR: BaremeGeste[] = [
  {
    id: "pac_air_eau",
    nom: "Pompe à chaleur Air/Eau",
    montants: { bleu: 5000, jaune: 4000, violet: 3000 },
    unite: "forfait",
    plafondDepenseEligible: 12000,
    conditionsTechniques: "COP ≥ 3,8, remplacement d'une chaudière fioul/gaz/charbon ou d'un chauffage électrique",
    eligibleParcoursGeste: true,
  },
  {
    id: "pac_geothermie",
    nom: "Pompe à chaleur géothermique (eau-eau / sol-eau)",
    montants: { bleu: 11000, jaune: 9000, violet: 6000 },
    unite: "forfait",
    plafondDepenseEligible: 18000,
    conditionsTechniques: "COP ≥ 3,8",
    eligibleParcoursGeste: true,
  },
  {
    id: "pac_hybride",
    nom: "PAC hybride (couplée à une chaudière gaz à condensation)",
    montants: { bleu: 5000, jaune: 4000, violet: 3000 },
    unite: "forfait",
    plafondDepenseEligible: 12000,
    conditionsTechniques: "Marquage CE, règlement EcoDesign UE 813/2013",
    eligibleParcoursGeste: true,
  },
  {
    id: "ballon_thermodynamique",
    nom: "Chauffe-eau thermodynamique",
    montants: { bleu: 1200, jaune: 800, violet: 400 }, // ordre de grandeur usuel, à confirmer sur le simulateur officiel
    unite: "forfait",
    plafondDepenseEligible: 4000,
    conditionsTechniques: "COP ≥ 2,6",
    eligibleParcoursGeste: false, // hors parcours par geste pour les dossiers déposés à partir du 01/09/2026 (décret 2026-822)
    note: "Montant non confirmé par une source 2026 directe lors de la dernière vérification — à valider sur france-renov.gouv.fr avant devis.",
  },
  {
    id: "isolation_combles_perdus",
    nom: "Isolation des combles perdus",
    montants: { bleu: 25, jaune: 20, violet: 15 },
    unite: "m2",
    plafondDepenseEligible: 75,
    conditionsTechniques: "R ≥ 7 m².K/W (BAR-EN-101, à vérifier selon fiche applicable)",
    eligibleParcoursGeste: false, // hors parcours par geste pour les dossiers déposés à partir du 01/09/2026 (décret 2026-822)
    note: "Barème 2026 ; profil Rose non éligible en geste seul.",
  },
  {
    id: "isolation_combles_amenages",
    nom: "Isolation des rampants / plafonds de combles aménagés",
    montants: { bleu: 25, jaune: 20, violet: 15 },
    unite: "m2",
    plafondDepenseEligible: 75, // €/m²
    conditionsTechniques: "R ≥ 6 m².K/W",
    eligibleParcoursGeste: false, // hors parcours par geste pour les dossiers déposés à partir du 01/09/2026 (décret 2026-822)
    note: "Barème rampants/combles aménagés ; vérifier la fiche et les critères techniques de l’opération.",
  },
  {
    id: "menuiseries_simple_vitrage",
    nom: "Remplacement de menuiseries (simple vitrage uniquement)",
    montants: { bleu: 100, jaune: 80, violet: 40 },
    unite: "equipement",
    plafondDepenseEligible: 100,
    conditionsTechniques: "Uw ≤ 1,3 W/m².K, remplace un simple vitrage existant",
    eligibleParcoursGeste: false, // hors parcours par geste pour les dossiers déposés à partir du 01/09/2026 (décret 2026-822)
    note: "Le remplacement d'un double vitrage existant n'est plus éligible au parcours par geste depuis 2026.",
  },
  {
    id: "vmc_double_flux",
    nom: "VMC Double Flux",
    montants: { bleu: 2000, jaune: 1500, violet: 1000 }, // ordre de grandeur, à confirmer
    unite: "forfait",
    plafondDepenseEligible: 6000,
    conditionsTechniques: "Rendement ≥ 85%",
    eligibleParcoursGeste: false, // hors parcours par geste pour les dossiers déposés à partir du 01/09/2026 (décret 2026-822)
    note: "Montant non confirmé par une source 2026 directe lors de la dernière vérification — à valider sur france-renov.gouv.fr avant devis.",
  },
];

// Plafond global : cumul MaPrimeRénov' par geste limité à 20 000€ par logement sur 5 ans.
export const PLAFOND_CUMUL_MPR_GESTE_5ANS = 20000;

// Écrêtement du cumul total des aides (MPR + CEE + autres) par profil.
export const TAUX_ECRETEMENT_CUMUL: Record<ProfilMPR, number> = {
  bleu: 0.90,
  jaune: 0.75,
  violet: 0.60,
  rose: 0.50, // hors parcours geste (rose exclu du mono-geste), indicatif pour rénovation d'ampleur
};

export function calculAideMPR(
  gesteId: GesteMPR,
  profil: ProfilMPR,
  montantTravauxHT: number,
  quantite: number = 1
): { montant: number; plafondAtteint: boolean; geste: BaremeGeste } {

  const geste = BAREME_GESTES_MPR.find(g => g.id === gesteId);

  // Depuis le 01/09/2026, seuls les gestes « eligibleParcoursGeste » ouvrent droit à MPR par geste
  // (PAC de chauffage, raccordement réseau de chaleur, dépose de cuve fioul, audit).
  if (geste && !geste.eligibleParcoursGeste) {
    return { montant: 0, plafondAtteint: false, geste };
  }

  if (!geste || profil === "rose") {
    // Profil Rose exclu du parcours par geste depuis le 01/01/2026
    return { montant: 0, plafondAtteint: false, geste: geste! };
  }

  const montantParUnite = geste.montants[profil] ?? 0;

  let montantBrut: number;
  let plafondAtteint = false;

  if (geste.unite === "forfait") {
    montantBrut = montantParUnite;
    if (montantTravauxHT > 0 && montantBrut > montantTravauxHT) {
      montantBrut = montantTravauxHT;
      plafondAtteint = true;
    }
  } else {
    // m2 ou equipement : montant proportionnel au nombre d'unités, plafonné implicitement
    // par la dépense éligible au m²/équipement (geste.plafondDepenseEligible)
    if (montantTravauxHT / Math.max(1, quantite) > geste.plafondDepenseEligible) {
      plafondAtteint = true;
    }
    montantBrut = montantParUnite * quantite;
  }

  return {
    montant: Math.round(montantBrut),
    plafondAtteint,
    geste,
  };
}
