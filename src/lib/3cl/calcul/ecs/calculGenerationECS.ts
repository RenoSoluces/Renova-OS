import { Batiment3CL } from "../../batiment3CL";
import { calculBesoinECS } from "./calculBesoinECS";
import { SYSTEMES_ECS } from "../../database/ecs";

export interface ResultatGenerationECS {

  rendement: number;

  cop: number;

  consommationGeneration: number;

}

export function calculGenerationECS(

  batiment: Batiment3CL

): ResultatGenerationECS {

  const besoin =
    calculBesoinECS(batiment);

  const systeme =
    batiment.ecs?.systeme ??
    "ballon_electrique";

  const equipement =
    SYSTEMES_ECS.find(
      e => e.id === systeme
    );

  if (!equipement) {

    return {

      rendement: 1,

      cop: 1,

      consommationGeneration:
        besoin.besoinAnnuelKWh,

    };

  }

  if (equipement.cop) {

    return {

      rendement: 1,

      cop: equipement.cop,

      consommationGeneration:
        besoin.besoinAnnuelKWh /
        equipement.cop,

    };

  }

  return {

    rendement: equipement.rendement,

    cop: 1,

    consommationGeneration:
      besoin.besoinAnnuelKWh /
      equipement.rendement,

  };

}