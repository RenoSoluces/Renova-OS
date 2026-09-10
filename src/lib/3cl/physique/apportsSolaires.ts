import { Batiment3CL } from "../batiment3CL";

export interface ResultatApports {

  apports: number;

}

const COEF = {

  Nord: 0.35,

  NordEst: 0.45,

  Est: 0.70,

  SudEst: 1.10,

  Sud: 1.40,

  SudOuest: 1.20,

  Ouest: 0.90,

  NordOuest: 0.50,

};

export function calculerApportsSolaires(
  batiment: Batiment3CL
): ResultatApports {

  let total = 0;

  for (const fenetre of batiment.menuiseries) {

    const coef =
      COEF[
        fenetre.orientation as keyof typeof COEF
      ] ?? 0.8;

    total +=
      fenetre.surface *
      coef *
      110;

  }

  return {

    apports:
      Math.round(total)

  };

}