import { Batiment3CL } from "../../batiment3CL";

export interface ResultatTransmission {

  murs: number;

  menuiseries: number;

  planchers: number;

  toitures: number;

  total: number;

}

export function calculTransmission(

  batiment: Batiment3CL

): ResultatTransmission {

  let murs = 0;

  let menuiseries = 0;

  let planchers = 0;

  let toitures = 0;

  for (const mur of batiment.murs) {

    murs +=

      mur.surface *

      mur.u;

  }

  for (const fenetre of batiment.menuiseries) {

    menuiseries +=

      fenetre.surface *

      fenetre.u;

  }

  for (const plancher of batiment.planchers) {

    planchers +=

      plancher.surface *

      plancher.u;

  }

  for (const toiture of batiment.toitures) {

    toitures +=

      toiture.surface *

      toiture.u;

  }

  return {

    murs,

    menuiseries,

    planchers,

    toitures,

    total:

      murs +

      menuiseries +

      planchers +

      toitures,

  };

}