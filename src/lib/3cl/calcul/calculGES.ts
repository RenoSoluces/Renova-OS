import { ENERGIES } from "../database/energies";

export function calculGES(

  consommationFinale: number,

  energie: string

): number {

  const e =

    ENERGIES.find(

      x => x.id === energie

    );

  if (!e) {

    return 0;

  }

  return consommationFinale * e.facteurCO2;

}