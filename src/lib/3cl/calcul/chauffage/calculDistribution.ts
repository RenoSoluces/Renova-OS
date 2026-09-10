export interface ResultatDistribution {

  rendementDistribution: number;

  consommationDistribution: number;

}

export function calculDistribution(

  consommationGeneration: number,

  typeDistribution: string

): ResultatDistribution {

  let rendement = 0.95;

  switch (typeDistribution) {

    case "plancher_chauffant":
      rendement = 0.98;
      break;

    case "radiateurs":
      rendement = 0.95;
      break;

    case "ventilo_convecteurs":
      rendement = 0.93;
      break;

  }

  return {

    rendementDistribution: rendement,

    consommationDistribution:
      consommationGeneration /
      rendement,

  };

}