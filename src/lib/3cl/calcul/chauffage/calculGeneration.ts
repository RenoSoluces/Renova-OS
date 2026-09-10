import { Batiment3CL } from "../../batiment3CL";
import { calculSCOP } from "./calculSCOP";
import { CHAUFFAGES } from "../../database/chauffages";

export interface ResultatGeneration {

  rendement: number;

  cop: number;

  consommationGeneration: number;

}

export function calculGeneration(

  batiment: Batiment3CL,

  besoin: number,

  systeme: string

): ResultatGeneration {

  const chauffage = CHAUFFAGES.find(
    c => c.id === systeme
  );

  if (!chauffage) {

    return {

      rendement: 1,

      cop: 1,

      consommationGeneration: besoin,

    };

  }

  // PAC : rendement de génération exprimé par un COP saisonnier (SCOP)
  if (systeme.startsWith("pac_")) {

    const scop = calculSCOP(
      batiment,
      systeme
    );

    return {

      rendement: 1,

      cop: scop.scop,

      consommationGeneration:

        besoin /

        scop.scop,

    };

  }

  // Chaudières / Bois / Electrique direct : rendement de génération classique
  return {

    rendement: chauffage.rendementGeneration,

    cop: 1,

    consommationGeneration:

      besoin /

      chauffage.rendementGeneration,

  };

}
