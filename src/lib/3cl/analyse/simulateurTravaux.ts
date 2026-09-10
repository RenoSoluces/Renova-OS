import { Batiment3CL } from "../batiment3CL";

import { analyseMaison } from "./analyseMaison";

export type TypeTravaux =
  | "combles"
  | "murs"
  | "plancher"
  | "menuiseries"
  | "pac"
  | "ballon_thermo"
  | "vmc";

export interface ResultatSimulation {

  avant: ReturnType<typeof analyseMaison>;

  apres: ReturnType<typeof analyseMaison>;

  gainConsommation: number;

  gainPourcentage: number;

}

export function simulateurTravaux(
  batiment: Batiment3CL,
  travaux: TypeTravaux
): ResultatSimulation {

  const avant = analyseMaison(batiment);

  const copie: Batiment3CL = structuredClone(batiment);

  switch (travaux) {

    case "combles":

      copie.toitures = copie.toitures.map(t => ({
        ...t,
        u: Math.min(t.u, 0.18),
      }));

      break;

    case "murs":

      copie.murs = copie.murs.map(m => ({
        ...m,
        u: Math.min(m.u, 0.25),
      }));

      break;

    case "plancher":

      copie.planchers = copie.planchers.map(p => ({
        ...p,
        u: Math.min(p.u, 0.25),
      }));

      break;

    case "menuiseries":

      copie.menuiseries = copie.menuiseries.map(f => ({
        ...f,
        u: 1.30,
        uw: 1.30,
        ug: 1.10,
        sw: 0.55,
        tlw: 0.78,
      }));

      break;

    case "pac":

      copie.chauffage = {
        ...(copie.chauffage ?? {}),
        systeme_principal: "pac_air_eau",
      } as Batiment3CL["chauffage"];

      break;

    case "ballon_thermo":

      copie.ecs = {
        ...(copie.ecs ?? {}),
        systeme: "ballon_thermodynamique",
      } as Batiment3CL["ecs"];

      break;

    case "vmc":

      copie.ventilation = {
        ...(copie.ventilation ?? {}),
        type: "vmc_hygro_b",
      } as Batiment3CL["ventilation"];

      break;

  }

  const apres = analyseMaison(copie);

  const consommationAvant =
    avant.dpe.chauffage.consommationEP +
    avant.dpe.ecs.consommationEP;

  const consommationApres =
    apres.dpe.chauffage.consommationEP +
    apres.dpe.ecs.consommationEP;

  const gain =
    consommationAvant - consommationApres;

  return {

    avant,

    apres,

    gainConsommation: Math.round(gain),

    gainPourcentage:

      consommationAvant === 0
        ? 0
        : Number(
            (
              (gain / consommationAvant) *
              100
            ).toFixed(1)
          ),

  };

}