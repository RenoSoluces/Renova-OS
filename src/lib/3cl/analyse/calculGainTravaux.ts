import { Batiment3CL } from "../batiment3CL";

import { calculDPE } from "../calculDPE";

import {
  simulerIsolationCombles,
  simulerIsolationMurs,
  simulerIsolationPlancher,
  simulerMenuiseries,
  simulerPAC,
  simulerPACAirAir,
  simulerBallonThermodynamique,
  simulerVMC,
  ResultatSimulation,
} from "../amelioration";

export interface GainTravaux {

  consommationAvant: number;

  consommationApres: number;

  gainCEP: number;

  gainPourcentage: number;

  gesAvant: number;

  gesApres: number;

  gainGES: number;

  etiquetteAvant: string;

  etiquetteApres: string;

}

export type TypeTravaux =

  | "combles"
  | "murs"
  | "plancher"
  | "menuiseries"
  | "pac"
  | "pac_air_air"
  | "ballon_thermodynamique"
  | "vmc";

export function calculGainTravaux(

  batiment: Batiment3CL,

  type: TypeTravaux

): GainTravaux {

  let simulation: ResultatSimulation;

  switch (type) {

    case "combles":
      simulation = simulerIsolationCombles(batiment);
      break;

    case "murs":
      simulation = simulerIsolationMurs(batiment);
      break;

    case "plancher":
      simulation = simulerIsolationPlancher(batiment);
      break;

    case "menuiseries":
      simulation = simulerMenuiseries(batiment);
      break;

    case "pac":
      simulation = simulerPAC(batiment);
      break;

    case "pac_air_air":
      simulation = simulerPACAirAir(batiment);
      break;

    case "ballon_thermodynamique":
      simulation = simulerBallonThermodynamique(batiment);
      break;

    case "vmc":
      simulation = simulerVMC(batiment);
      break;

    default:

      simulation = {

        batiment,

        avant: calculDPE(batiment),

        apres: calculDPE(batiment),

      };

  }

  const avant = simulation.avant;

  const apres = simulation.apres;

  const gainCEP =

    avant.consommationEP -

    apres.consommationEP;

  const gainGES =

    avant.emissionsCO2 -

    apres.emissionsCO2;

  const gainPourcentage =

    avant.consommationEP > 0

      ? (gainCEP / avant.consommationEP) * 100

      : 0;

  return {

    consommationAvant:
      avant.consommationEP,

    consommationApres:
      apres.consommationEP,

    gainCEP:
      Math.round(gainCEP),

    gainPourcentage:
      Math.round(gainPourcentage * 10) / 10,

    gesAvant:
      avant.emissionsCO2,

    gesApres:
      apres.emissionsCO2,

    gainGES:
      Math.round(gainGES),

    etiquetteAvant:
      avant.etiquette,

    etiquetteApres:
      apres.etiquette,

  };

}