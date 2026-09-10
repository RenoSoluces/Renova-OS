export interface ResultatDistributionECS {

  pertesDistribution: number;

  consommationDistribution: number;

}

export function calculDistributionECS(

  consommationStockage: number,

  surface: number

): ResultatDistributionECS {

  /*
      Approximation :

      3 %

      +1 % tous les 50 m²
  */

  const pertes =

    0.03 +

    Math.floor(surface / 50) * 0.01;

  return {

    pertesDistribution: pertes,

    consommationDistribution:

      consommationStockage *

      (1 + pertes),

  };

}