import { Batiment3CL } from "./batiment3CL";

import { calculerApportsSolaires } from "./physique/apportsSolaires";
import { calculerInertie } from "./physique/inertie";


export interface ResultatClimatisation {

  besoinFroid: number;

  besoinSpecifique: number;

  coefficientInertie: number;

  niveauSurchauffe:
    | "faible"
    | "modéré"
    | "élevé";

}


function determinerNiveauSurchauffe(
  besoinSpecifique: number
):
  | "faible"
  | "modéré"
  | "élevé" {

  if (besoinSpecifique < 10) {

    return "faible";

  }

  if (besoinSpecifique < 25) {

    return "modéré";

  }

  return "élevé";

}


export function calculerClimatisation(

  batiment: Batiment3CL

): ResultatClimatisation {


  /*
   * Apports solaires
   *
   * Calcul basé sur :
   * - orientation
   * - surface vitrée
   * - facteur solaire vitrage
   */

  const apports =

    calculerApportsSolaires(
      batiment
    );


  /*
   * Inertie du bâtiment
   *
   * Une maison lourde limite
   * les variations rapides de température.
   */

  const inertie =

    calculerInertie(
      batiment
    );


  const coefficientInertie =

    inertie.coefficient ?? 1;


  /*
   * Besoin froid simplifié :
   *
   * Apports solaires
   * x facteur bâtiment
   * x inertie
   *
   * Le moteur pourra évoluer ensuite
   * avec :
   * - DH été
   * - protections solaires
   * - masques
   * - ventilation nocturne
   */

  const besoinFroid =

    apports.apports *

    0.12 *

    coefficientInertie;


  const besoinSpecifique =

    batiment.surfaceHabitable > 0

      ?

      besoinFroid /
      batiment.surfaceHabitable

      :

      0;


  return {


    besoinFroid:

      Math.round(
        besoinFroid
      ),


    besoinSpecifique:

      Math.round(
        besoinSpecifique * 10
      ) / 10,


    coefficientInertie,


    niveauSurchauffe:

      determinerNiveauSurchauffe(
        besoinSpecifique
      ),

  };

}