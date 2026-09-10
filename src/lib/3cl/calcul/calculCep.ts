import { ENERGIES } from "../database/energies";

export function calculCep(

  consommationFinale: number,

  energie: string

): number {

  const e =

    ENERGIES.find(

      x => x.id === energie

    );

  if (!e) {

    return consommationFinale;

  }

  return consommationFinale * e.facteurEP;

}