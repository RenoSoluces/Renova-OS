import { Batiment3CL } from "../batiment3CL";

import { calculDeperditions } from "../calcul/deperditions/calculDeperditions";
import { calculGainTravaux, TypeTravaux } from "./calculGainTravaux";
import { appliquerTravaux, GesteTravaux } from "../amelioration";

export interface PropositionTravaux {

  id: TypeTravaux;

  titre: string;

  description: string;

  priorite: number;

  gainCEP: number;

  gainPourcentage: number;

  gainGES: number;

  etiquetteAvant: string;

  etiquetteApres: string;

}

export function proposerTravaux(

  batiment: Batiment3CL

): PropositionTravaux[] {

  const dep = calculDeperditions(batiment);

  const total = Math.max(dep.total, 1);

  const travaux: PropositionTravaux[] = [];

  function ajouter(

    id: TypeTravaux,

    titre: string,

    description: string,

    priorite: number

  ) {

    const gain = calculGainTravaux(

      batiment,

      id

    );

    travaux.push({

      id,

      titre,

      description,

      priorite,

      gainCEP: gain.gainCEP,

      gainPourcentage: gain.gainPourcentage,

      gainGES: gain.gainGES,

      etiquetteAvant: gain.etiquetteAvant,

      etiquetteApres: gain.etiquetteApres,

    });

  }

  // ---------------------------------------
  // COMBLES
  // ---------------------------------------

  if (dep.toitures / total > 0.10) {

    ajouter(

      "combles",

      "Isolation des combles",

      "Limiter les pertes par la toiture.",

      Math.round((dep.toitures / total) * 100)

    );

  }

  // ---------------------------------------
  // MURS
  // ---------------------------------------

  if (dep.murs / total > 0.15) {

    ajouter(

      "murs",

      "Isolation des murs",

      "Réduire les pertes à travers les murs.",

      Math.round((dep.murs / total) * 100)

    );

  }

  // ---------------------------------------
  // PLANCHER
  // ---------------------------------------

  if (dep.planchers / total > 0.08) {

    ajouter(

      "plancher",

      "Isolation du plancher bas",

      "Améliorer le confort et supprimer les déperditions du sol.",

      Math.round((dep.planchers / total) * 100)

    );

  }

  // ---------------------------------------
  // MENUISERIES
  // ---------------------------------------

  if (dep.menuiseries / total > 0.08) {

    ajouter(

      "menuiseries",

      "Remplacement des fenêtres",

      "Installer des menuiseries performantes.",

      Math.round((dep.menuiseries / total) * 100)

    );

  }

  // ---------------------------------------
  // VMC
  // ---------------------------------------

  if (dep.renouvellementAir / total > 0.10) {

    ajouter(

      "vmc",

      "Installation d'une VMC Hygroréglable B",

      "Réduire les pertes dues au renouvellement d'air.",

      Math.round((dep.renouvellementAir / total) * 100)

    );

  }

  // ---------------------------------------
  // PAC AIR / EAU
  // ---------------------------------------

  ajouter(

    "pac",

    "Pompe à chaleur Air/Eau",

    "Remplacer le système de chauffage actuel.",

    100

  );

  // ---------------------------------------
  // PAC AIR / AIR
  // ---------------------------------------

  ajouter(

    "pac_air_air",

    "Pompe à chaleur Air/Air",

    "Alternative performante pour le chauffage.",

    95

  );

  // ---------------------------------------
  // BALLON THERMODYNAMIQUE
  // ---------------------------------------

  ajouter(

    "ballon_thermodynamique",

    "Ballon thermodynamique",

    "Réduire la consommation d'eau chaude sanitaire.",

    70

  );

  travaux.sort((a, b) => {

    if (b.gainPourcentage !== a.gainPourcentage) {

      return b.gainPourcentage - a.gainPourcentage;

    }

    return b.priorite - a.priorite;

  });

  return travaux;

}

/* --------------------------------------------------
   BOUQUETS DE TRAVAUX
   --------------------------------------------------
   Combine plusieurs gestes en une seule rénovation cohérente (ex : enveloppe complète,
   ou enveloppe + changement de système de chauffage) plutôt que de ne proposer que des
   gestes isolés. Chaque bouquet n'est proposé que si au moins un de ses gestes est
   pertinent au vu des déperditions réelles du logement (cf. proposerTravaux()).
-------------------------------------------------- */

export interface PropositionBouquet {
  id: string;
  titre: string;
  description: string;
  gestes: GesteTravaux[];
  gestesLabels: string[];
  gainCEP: number;
  gainPourcentage: number;
  gainGES: number;
  etiquetteAvant: string;
  etiquetteApres: string;
  sautsEtiquette: number;
}

const LABEL_GESTE: Record<GesteTravaux, string> = {
  combles: "Isolation des combles",
  murs: "Isolation des murs",
  plancher: "Isolation du plancher bas",
  menuiseries: "Remplacement des menuiseries",
  pac: "Pompe à chaleur Air/Eau",
  pac_air_air: "Pompe à chaleur Air/Air",
  ballon_thermodynamique: "Ballon thermodynamique",
  vmc: "VMC Hygroréglable B",
};

const ORDRE_ETIQUETTES = ["A", "B", "C", "D", "E", "F", "G"];

function construireBouquet(
  batiment: Batiment3CL,
  id: string,
  titre: string,
  description: string,
  gestes: GesteTravaux[]
): PropositionBouquet {
  const { avant, apres } = appliquerTravaux(batiment, gestes);
  const gainCEP = Math.round(avant.consommationEP - apres.consommationEP);
  const gainGES = Math.round(avant.emissionsCO2 - apres.emissionsCO2);
  const gainPourcentage = avant.consommationEP > 0
    ? Math.round(((gainCEP / avant.consommationEP) * 100) * 10) / 10
    : 0;
  return {
    id,
    titre,
    description,
    gestes,
    gestesLabels: gestes.map(g => LABEL_GESTE[g]),
    gainCEP,
    gainPourcentage,
    gainGES,
    etiquetteAvant: avant.etiquette,
    etiquetteApres: apres.etiquette,
    sautsEtiquette: Math.max(0, ORDRE_ETIQUETTES.indexOf(avant.etiquette) - ORDRE_ETIQUETTES.indexOf(apres.etiquette)),
  };
}

export function proposerBouquets(batiment: Batiment3CL): PropositionBouquet[] {
  const dep = calculDeperditions(batiment);
  const total = Math.max(dep.total, 1);

  const comblesPertinent = dep.toitures / total > 0.10;
  const mursPertinent = dep.murs / total > 0.15;
  const plancherPertinent = dep.planchers / total > 0.08;
  const menuiseriesPertinent = dep.menuiseries / total > 0.08;

  const gestesEnveloppe: GesteTravaux[] = [
    ...(comblesPertinent ? (["combles"] as GesteTravaux[]) : []),
    ...(mursPertinent ? (["murs"] as GesteTravaux[]) : []),
    ...(plancherPertinent ? (["plancher"] as GesteTravaux[]) : []),
    ...(menuiseriesPertinent ? (["menuiseries"] as GesteTravaux[]) : []),
  ];

  const bouquets: PropositionBouquet[] = [];

  // Bouquet "enveloppe" : tous les gestes d'isolation pertinents, sans toucher au chauffage.
  if (gestesEnveloppe.length >= 2) {
    bouquets.push(construireBouquet(
      batiment,
      "enveloppe",
      "Rénovation de l'enveloppe",
      "Traite en une seule fois tous les points faibles d'isolation identifiés lors de la visite, sans changer le système de chauffage.",
      gestesEnveloppe
    ));
  }

  // Bouquet "chauffage performant" : changement du système de chauffage + ECS.
  bouquets.push(construireBouquet(
    batiment,
    "chauffage",
    "Changement du système de chauffage",
    "Remplace le système de chauffage par une pompe à chaleur Air/Eau et l'eau chaude sanitaire par un ballon thermodynamique.",
    ["pac", "ballon_thermodynamique"]
  ));

  // Bouquet "rénovation globale" : enveloppe + chauffage + ventilation, la combinaison la
  // plus efficace pour un saut d'étiquette important (logique BBC rénovation).
  if (gestesEnveloppe.length >= 1) {
    bouquets.push(construireBouquet(
      batiment,
      "globale",
      "Rénovation globale",
      "Combine l'isolation de l'enveloppe, le renouvellement du système de chauffage et la ventilation pour un gain maximal — la solution la plus efficace pour sauter plusieurs classes DPE.",
      [...gestesEnveloppe, "pac", "vmc"]
    ));
  }

  return bouquets.sort((a, b) => b.gainPourcentage - a.gainPourcentage);
}