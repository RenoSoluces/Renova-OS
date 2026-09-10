import { Batiment3CL } from "../../batiment3CL";

import { calculVentilation } from "./calculVentilation";
import { calculInfiltration } from "./calculInfiltration";

export interface ResultatRenouvellementAir {

  ventilation: number;

  infiltration: number;

  total: number;

}

export function calculRenouvellementAir(
  batiment: Batiment3CL
): ResultatRenouvellementAir {

  const ventilation =
    calculVentilation(batiment);

  const infiltration =
    calculInfiltration(batiment);

  return {

    ventilation:
      ventilation.hVentilation,

    infiltration:
      infiltration.hInfiltration,

    total:
      ventilation.hVentilation +
      infiltration.hInfiltration,

  };

}