import { Batiment3CL } from "../../batiment3CL";

import { calculTransmission } from "./calculTransmission";
import { calculPontsThermiques } from "./calculPontsThermiques";
import { construirePontsThermiques } from "../../construction/construirePontsThermiques";
import { calculRenouvellementAir } from "../ventilation/calculRenouvellementAir";

export interface ResultatDeperditions {

  murs: number;

  menuiseries: number;

  planchers: number;

  toitures: number;

  transmission: number;

  pontsThermiques: number;

  renouvellementAir: number;

  total: number;

}

export function calculDeperditions(

  batiment: Batiment3CL

): ResultatDeperditions {

  const transmission =

    calculTransmission(
      batiment
    );

  const liaisons =

    construirePontsThermiques(
      batiment
    );

  const ponts =

    calculPontsThermiques(
      liaisons
    );

  const air =

    calculRenouvellementAir(
      batiment
    );

  return {

    murs:
      transmission.murs,

    menuiseries:
      transmission.menuiseries,

    planchers:
      transmission.planchers,

    toitures:
      transmission.toitures,

    transmission:
      transmission.total,

    pontsThermiques:
      ponts.total,

    renouvellementAir:
      air.total,

    total:

      transmission.total +

      ponts.total +

      air.total,

  };

}