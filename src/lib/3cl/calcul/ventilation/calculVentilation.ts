import { Batiment3CL } from "../../batiment3CL";
import { VENTILATIONS } from "../../database/ventilation";

export interface ResultatVentilation {

  debitAir: number;

  hVentilation: number;

  type: string;

}

const CP_AIR = 0.34;

/*
0.34 = capacité thermique volumique de l'air
(Wh / m3.K)

Formule réglementaire :

Hv = 0.34 × qv
*/

export function calculVentilation(
  batiment: Batiment3CL
): ResultatVentilation {

  const type =
    batiment.ventilation?.type ||
    "naturelle";

  const systeme =
    VENTILATIONS.find(v => v.id === type);

  const renouvellement =
    systeme?.renouvellement ??
    1.3;

  const debitAir =
    batiment.volumeChauffe *
    renouvellement;

  const hVentilation =
    debitAir *
    CP_AIR;

  return {

    debitAir,

    hVentilation,

    type,

  };

}