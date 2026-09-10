import { Batiment3CL } from "../batiment3CL";

export interface ResultatPontsThermiques {

  coefficient: number;

  pertes: number;

}

export function calculPontsThermiques(
  batiment: Batiment3CL
): ResultatPontsThermiques {

  const surface =
    batiment.surfaceHabitable;

  const annee =
    batiment.anneeConstruction;

  let psi = 0.45;

  if (annee >= 2013)
    psi = 0.18;

  else if (annee >= 2005)
    psi = 0.25;

  else if (annee >= 1990)
    psi = 0.35;

  else if (annee >= 1975)
    psi = 0.50;

  else
    psi = 0.70;

  const longueurPonts =
    Math.sqrt(surface) * 12;

  return {

    coefficient: psi,

    pertes:
      Math.round(
        psi * longueurPonts
      )

  };

}