import { Batiment3CL } from "../batiment3CL";

import { calculDPE } from "../calculDPE";
import { calculDeperditions } from "../calcul/deperditions/calculDeperditions";

export interface PosteAnalyse {

  nom: string;

  perte: number;

  pourcentage: number;

}

export interface AnalyseMaison {

  dpe: ReturnType<typeof calculDPE>;

  deperditions: ReturnType<typeof calculDeperditions>;

  postes: PosteAnalyse[];

  recommandations: string[];

}

export function analyseMaison(

  batiment: Batiment3CL

): AnalyseMaison {

  const dpe =

    calculDPE(
      batiment
    );

  const dep =

    calculDeperditions(
      batiment
    );

  const total =

    dep.total || 1;

  const postes: PosteAnalyse[] = [

    {

      nom: "Murs",

      perte: dep.murs,

      pourcentage:

        dep.murs *

        100 /

        total,

    },

    {

      nom: "Menuiseries",

      perte: dep.menuiseries,

      pourcentage:

        dep.menuiseries *

        100 /

        total,

    },

    {

      nom: "Planchers",

      perte: dep.planchers,

      pourcentage:

        dep.planchers *

        100 /

        total,

    },

    {

      nom: "Toitures",

      perte: dep.toitures,

      pourcentage:

        dep.toitures *

        100 /

        total,

    },

    {

      nom: "Ponts thermiques",

      perte: dep.pontsThermiques,

      pourcentage:

        dep.pontsThermiques *

        100 /

        total,

    },

    {

      nom: "Renouvellement d'air",

      perte: dep.renouvellementAir,

      pourcentage:

        dep.renouvellementAir *

        100 /

        total,

    }

  ];

  postes.sort(

    (a, b) =>

      b.perte -

      a.perte

  );

  const recommandations: string[] = [];

  for (const poste of postes) {

    switch (poste.nom) {

      case "Toitures":

        recommandations.push(
          "Isoler les combles ou la toiture."
        );

        break;

      case "Murs":

        recommandations.push(
          "Améliorer l'isolation des murs."
        );

        break;

      case "Menuiseries":

        recommandations.push(
          "Remplacer les menuiseries par du double ou triple vitrage."
        );

        break;

      case "Planchers":

        recommandations.push(
          "Isoler le plancher bas."
        );

        break;

      case "Renouvellement d'air":

        recommandations.push(
          "Installer une VMC performante."
        );

        break;

      case "Ponts thermiques":

        recommandations.push(
          "Traiter les ponts thermiques."
        );

        break;

    }

  }

  return {

    dpe,

    deperditions: dep,

    postes,

    recommandations,

  };

}