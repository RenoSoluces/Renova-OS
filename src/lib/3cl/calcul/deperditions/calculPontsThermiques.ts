import { PONTS_THERMIQUES } from "../../database/pontsThermiques";

export interface LiaisonThermique {

  type:
    | "mur_plancher"
    | "mur_toiture"
    | "mur_refend"
    | "linteau"
    | "tableau"
    | "balcon";

  longueur: number;

}

export interface ResultatPonts {

  total: number;

  details: {
    type: string;
    longueur: number;
    psi: number;
    perte: number;
  }[];

}

export function calculPontsThermiques(
  liaisons: LiaisonThermique[]
): ResultatPonts {

  let total = 0;

  const details = [];

  for (const liaison of liaisons) {

    const pont = PONTS_THERMIQUES.find(
      p => p.id === liaison.type
    );

    if (!pont) continue;

    const perte =
      pont.psi * liaison.longueur;

    total += perte;

    details.push({

      type: pont.nom,

      longueur: liaison.longueur,

      psi: pont.psi,

      perte,

    });

  }

  return {

    total,

    details,

  };

}