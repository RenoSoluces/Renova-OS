import { Batiment3CL } from "../../batiment3CL";
import { CHAUFFAGES } from "../../database/chauffages";

export interface ResultatCOP {

  cop: number;

  temperatureExterieure: number;

}

const TEMP_BASE = {

  H1a: -7,
  H1b: -6,
  H1c: -5,

  H2a: -4,
  H2b: -3,
  H2c: -2,
  H2d: -1,

  H3: 1,

};

// COP d'une PAC à la température de base de la zone climatique. Le champ
// "rendementGeneration" de la base CHAUFFAGES sert de COP nominal (conditions
// normalisées) pour les systèmes de type PAC (id préfixé "pac_").
export function calculCOP(

  batiment: Batiment3CL,

  systeme: string

): ResultatCOP {

  const chauffage =
    CHAUFFAGES.find(
      c => c.id === systeme
    );

  const estPAC = systeme.startsWith("pac_");

  if (!chauffage || !estPAC) {

    return {

      cop: chauffage?.rendementGeneration ?? 1,

      temperatureExterieure: 0,

    };

  }

  const tExt =
    TEMP_BASE[
      batiment.zoneClimatique as keyof typeof TEMP_BASE
    ] ?? -2;

  let cop = chauffage.rendementGeneration;

  /*
      Approximation
      perte de COP
      selon température
  */

  if (tExt <= -7)
    cop *= 0.72;

  else if (tExt <= -2)
    cop *= 0.84;

  else if (tExt <= 2)
    cop *= 0.92;

  else if (tExt <= 7)
    cop *= 1;

  else
    cop *= 1.08;

  // NB : la pénalité liée à la température de départ d'eau (radiateurs haute
  // température vs plancher chauffant basse température) n'est plus modélisée ici :
  // le wizard ne capture pas encore le type d'émetteur associé au générateur. À
  // réintroduire si cette donnée devient disponible (impact significatif sur le COP
  // réel d'une PAC air/eau : jusqu'à -15 à -20% avec des radiateurs haute température).

  return {

    cop:
      Math.round(cop * 100) / 100,

    temperatureExterieure:
      tExt,

  };

}
