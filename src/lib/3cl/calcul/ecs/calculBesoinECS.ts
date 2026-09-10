import { Batiment3CL } from "../../batiment3CL";

export interface ResultatBesoinECS {

  nbOccupants: number;

  besoinLitresJour: number;

  besoinAnnuelKWh: number;

}

export function calculBesoinECS(

  batiment: Batiment3CL

): ResultatBesoinECS {

  const surface =
    batiment.surfaceHabitable;

  /*
      Approximation DPE

      1 occupant / 35 m²

      mini 1

      maxi 6
  */

  const nbOccupants = Math.max(

    1,

    Math.min(

      6,

      Math.round(surface / 35)

    )

  );

  /*
      50 litres / jour

      à 40°C
  */

  const litresJour =
    nbOccupants * 50;

  /*
      Energie

      1 litre ≈ 0.0407 kWh
  */

  const besoinAnnuel =

    litresJour *

    365 *

    0.0407;

  return {

    nbOccupants,

    besoinLitresJour: litresJour,

    besoinAnnuelKWh:

      Math.round(besoinAnnuel),

  };

}