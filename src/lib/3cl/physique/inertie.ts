import { Batiment3CL } from "../batiment3CL";

export interface ResultatInertie {

  niveau: "Faible" | "Moyenne" | "Forte";

  coefficient: number;

}

export function calculerInertie(
  batiment: Batiment3CL
): ResultatInertie {

  let score = 0;

  for (const mur of batiment.murs) {

    if (mur.u <= 0.30)
      score += 3;

    else if (mur.u <= 0.60)
      score += 2;

    else
      score += 1;

  }

  score += batiment.planchers.length * 2;

  score += batiment.toitures.length;

  if (score >= 18) {

    return {

      niveau: "Forte",

      coefficient: 0.85,

    };

  }

  if (score >= 10) {

    return {

      niveau: "Moyenne",

      coefficient: 1,

    };

  }

  return {

    niveau: "Faible",

    coefficient: 1.15,

  };

}