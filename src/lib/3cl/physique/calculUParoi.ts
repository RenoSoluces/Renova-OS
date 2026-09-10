import { MATERIAUX } from "../database/materiaux";
import { ISOLANTS } from "../database/isolants";

const RSI = 0.13;
const RSE = 0.04;

export interface ParametresParoi {

  materiau: string;

  epaisseurMateriauCm: number;

  isolant?: string;

  epaisseurIsolantCm?: number;

}

export interface ResultatU {

  resistanceTotale: number;

  coefficientU: number;

}

export function calculUParoi(
  params: ParametresParoi
): ResultatU {

  const materiau =
    MATERIAUX.find(
      m => m.id === params.materiau
    ) ??
    MATERIAUX.find(m => m.id === "parpaing") ??
    MATERIAUX[0];

  let rTotal =
    RSI +
    RSE;

  const epaisseurMur =
    params.epaisseurMateriauCm / 100;

  rTotal +=
    epaisseurMur /
    materiau.lambda;

  if (
    params.isolant &&
    params.epaisseurIsolantCm &&
    params.epaisseurIsolantCm > 0
  ) {

    const isolant =
      ISOLANTS.find(
        i => i.id === params.isolant
      );

    if (isolant) {

      rTotal +=
        (params.epaisseurIsolantCm / 100) /
        isolant.lambda;

    }

  }

  return {

    resistanceTotale:
      Number(rTotal.toFixed(3)),

    coefficientU:
      Number((1 / rTotal).toFixed(3)),

  };

}