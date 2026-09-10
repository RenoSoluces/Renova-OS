import { Batiment3CL } from "./batiment3CL";

import {
  calculConsommationChauffage,
} from "./calcul/chauffage/calculConsommationChauffage";

import {
  calculConsommationECS,
} from "./calcul/ecs/calculConsommationECS";

import {
  calculerClimatisation,
} from "./climatisation";

import {
  calculAuxiliaires,
} from "./calcul/calculAuxiliaires";

import {
  calculEtiquetteEnergie,
  calculEtiquetteGES,
  fusionnerEtiquettes,
} from "./calcul/calculEtiquette";

import { ENERGIES } from "./database/energies";

export interface ResultatDPE {

  consommationFinale: number;

  consommationEP: number;

  emissionsCO2: number;

  consommationM2: number;

  emissionsM2: number;

  etiquetteEnergie: string;

  etiquetteGES: string;

  etiquette: string; // étiquette finale (double seuil) — c'est CELLE-CI qui doit être affichée

  couleurEnergie: string;

  couleurGES: string;

  couleur: string; // couleur de l'étiquette finale

  chauffage: ReturnType<typeof calculConsommationChauffage>;

  ecs: ReturnType<typeof calculConsommationECS>;

  climatisation: ReturnType<typeof calculerClimatisation>;

}

export function calculDPE(

  batiment: Batiment3CL

): ResultatDPE {

  const chauffage =
    calculConsommationChauffage(batiment);

  const ecs =
    calculConsommationECS(batiment);

  const climatisation =
    calculerClimatisation(batiment);

  const auxiliaires =
    calculAuxiliaires(batiment);

  // Les auxiliaires (circulateurs, ventilateurs) sont quasi systématiquement électriques :
  // leur consommation finale doit être convertie en énergie primaire avec le facteur
  // électricité (1,9), pas ajoutée telle quelle comme si EP = énergie finale.
  const facteurEPAuxiliaires =
    ENERGIES.find(e => e.id === "electricite")?.facteurEP ?? 1.9;

  const consommationFinale =

    chauffage.consommationFinale +

    ecs.consommationFinale +

    auxiliaires.consommationAuxiliaires;

  const consommationEP =

    chauffage.consommationEP +

    ecs.consommationEP +

    auxiliaires.consommationAuxiliaires * facteurEPAuxiliaires;

  const emissionsCO2 =

    chauffage.emissionsCO2 +

    ecs.emissionsCO2 +

    // Auxiliaires électriques : mêmes conventions que pour l'énergie primaire ci-dessus.
    auxiliaires.consommationAuxiliaires * (ENERGIES.find(e => e.id === "electricite")?.facteurCO2 ?? 0.079);

  const surface =

    Math.max(1, batiment.surfaceHabitable);

  const consommationM2 =

    consommationEP / surface;

  const emissionsM2 =

    emissionsCO2 / surface;

  const energie =
    calculEtiquetteEnergie(consommationM2);

  const ges =
    calculEtiquetteGES(emissionsM2);

  const finale =
    fusionnerEtiquettes(energie, ges);

  return {

    consommationFinale:
      Math.round(consommationFinale),

    consommationEP:
      Math.round(consommationEP),

    emissionsCO2:
      Math.round(emissionsCO2),

    consommationM2:
      Math.round(consommationM2 * 10) / 10,

    emissionsM2:
      Math.round(emissionsM2 * 10) / 10,

    etiquetteEnergie:
      energie.lettre,

    etiquetteGES:
      ges.lettre,

    etiquette:
      finale.lettre,

    couleurEnergie:
      energie.couleur,

    couleurGES:
      ges.couleur,

    couleur:
      finale.couleur,

    chauffage,

    ecs,

    climatisation,

  };

}
