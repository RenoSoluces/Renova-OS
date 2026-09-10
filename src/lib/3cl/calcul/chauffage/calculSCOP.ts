import { Batiment3CL } from "../../batiment3CL";
import { calculCOP } from "./calculCOP";

export interface ResultatSCOP {

  scop: number;

}

export function calculSCOP(

  batiment: Batiment3CL,

  systeme: string

): ResultatSCOP {

  const cop = calculCOP(
    batiment,
    systeme
  );

  /*
      Pertes saisonnières :

      - dégivrage
      - démarrages
      - cycles
      - fonctionnement partiel

      approximation :
      SCOP = COP × 0.92
  */

  const scop =
    cop.cop * 0.92;

  return {

    scop:
      Math.round(scop * 100) / 100,

  };

}