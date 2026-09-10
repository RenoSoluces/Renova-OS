export interface ResultatRegulation {

  rendementRegulation: number;

  consommationRegulee: number;

}

export function calculRegulation(

  consommation: number,

  regulation: string

): ResultatRegulation {

  let rendement = 0.95;

  switch (regulation) {

    case "thermostat":
      rendement = 0.96;
      break;

    case "programmateur":
      rendement = 0.98;
      break;

    case "piece_par_piece":
      rendement = 0.99;
      break;

  }

  return {

    rendementRegulation: rendement,

    consommationRegulee:
      consommation /
      rendement,

  };

}