import { Batiment3CL } from "../batiment3CL";

export interface ResultatAuxiliaires {

  consommationAuxiliaires: number;

}

export function calculAuxiliaires(

  batiment: Batiment3CL

): ResultatAuxiliaires {

  /*
      auxiliaires :

      circulateurs

      ventilateurs

      régulation

      automate
  */

  const surface =
    batiment.surfaceHabitable;

  let conso = 0;

  if (
    batiment.chauffage?.systeme_principal
      ?.includes("pac")
  ) {

    conso =
      surface * 3.5;

  }

  else {

    conso =
      surface * 1.5;

  }

  return {

    consommationAuxiliaires:

      Math.round(conso),

  };

}