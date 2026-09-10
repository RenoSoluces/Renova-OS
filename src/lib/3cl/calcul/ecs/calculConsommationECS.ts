import { Batiment3CL } from "../../batiment3CL";

import { calculGenerationECS } from "./calculGenerationECS";
import { calculStockageECS } from "./calculStockageECS";
import { calculDistributionECS } from "./calculDistributionECS";

import { SYSTEMES_ECS } from "../../database/ecs";

export interface ResultatConsommationECS {

  besoin: number;

  consommationFinale: number;

  consommationEP: number;

  emissionsCO2: number;

}

export function calculConsommationECS(

  batiment: Batiment3CL

): ResultatConsommationECS {

  const systeme =

    batiment.ecs?.systeme ??

    "ballon_electrique";

  const generation =

    calculGenerationECS(batiment);

  const stockage =

    calculStockageECS(

      generation.consommationGeneration,

      systeme

    );

  const distribution =

    calculDistributionECS(

      stockage.consommationStockage,

      batiment.surfaceHabitable

    );

  const consommationFinale =

    distribution.consommationDistribution;

  const equipement =

    SYSTEMES_ECS.find(

      (e) => e.id === systeme

    );

  const facteurEP =

    equipement?.facteurEP ?? 1;

  const facteurGES =

    equipement?.facteurGES ?? 0;

  return {

    besoin: Math.round(

      generation.consommationGeneration

    ),

    consommationFinale:

      Math.round(consommationFinale),

    consommationEP:

      Math.round(

        consommationFinale *

        facteurEP

      ),

    emissionsCO2:

      Math.round(

        consommationFinale *

        facteurGES

      ),

  };

}