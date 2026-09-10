import { Paroi3CL } from "../types/paroi";

const RSI = 0.13;
const RSE = 0.04;

export interface ResultatResistance {

  resistance: number;

  coefficientU: number;

}

export function calculResistanceParoi(

  paroi: Paroi3CL

): ResultatResistance {

  let r = RSI + RSE;

  for (const couche of paroi.couches) {

    r +=

      couche.epaisseur /

      couche.lambda;

  }

  return {

    resistance:

      Number(r.toFixed(3)),

    coefficientU:

      Number((1 / r).toFixed(3))

  };

}