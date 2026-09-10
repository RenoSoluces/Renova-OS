export interface ResultatEmission {

  rendementEmission: number;

  consommationEmission: number;

}

export function calculEmission(

  consommationDistribution: number,

  typeEmission: string

): ResultatEmission {

  let rendement = 0.98;

  switch (typeEmission) {

    case "radiateur":
      rendement = 0.98;
      break;

    case "plancher":
      rendement = 1;
      break;

    case "ventilo":
      rendement = 0.97;
      break;

  }

  return {

    rendementEmission: rendement,

    consommationEmission:
      consommationDistribution /
      rendement,

  };

}