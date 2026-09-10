import { Batiment3CL } from "../batiment3CL";

import {
  moteur3CL,
  ResultatMoteur3CL,
} from "../moteur3CL";

export type ResultatAnalyseComplete = ResultatMoteur3CL;

export function analyseComplete(
  batiment: Batiment3CL
): ResultatAnalyseComplete {

  return moteur3CL(batiment);

}