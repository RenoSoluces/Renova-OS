import { SYSTEMES_ECS } from "../../database/ecs";

export interface ResultatStockageECS {

  pertesStockage: number;

  consommationStockage: number;

}

export function calculStockageECS(

  consommationGeneration: number,

  systeme: string

): ResultatStockageECS {

  const ecs =
    SYSTEMES_ECS.find(
      e => e.id === systeme
    );

  let pertes = 0;

  if (ecs?.stockage) {

    pertes = 0.10;

  }

  return {

    pertesStockage: pertes,

    consommationStockage:

      consommationGeneration *

      (1 + pertes),

  };

}