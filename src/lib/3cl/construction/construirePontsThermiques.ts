import { Batiment3CL } from "../batiment3CL";
import { LiaisonThermique } from "../calcul/deperditions/calculPontsThermiques";

export function construirePontsThermiques(
  batiment: Batiment3CL
): LiaisonThermique[] {

  const liaisons: LiaisonThermique[] = [];

  for (const mur of batiment.murs) {

    liaisons.push({
      type: "mur_plancher",
      longueur: Math.sqrt(mur.surface),
    });

    liaisons.push({
      type: "mur_toiture",
      longueur: Math.sqrt(mur.surface),
    });

  }

  return liaisons;

}