export interface TypeToiture {

  id: string;

  nom: string;

  u: number;

  inertie:
    | "faible"
    | "moyenne"
    | "forte";

}

export const TOITURES: TypeToiture[] = [

  {

    id: "combles_perdus",

    nom: "Combles perdus",

    u: 0.22,

    inertie: "moyenne",

  },

  {

    id: "combles_amenages",

    nom: "Rampants isolés",

    u: 0.28,

    inertie: "moyenne",

  },

  {

    id: "toiture_terrasse",

    nom: "Toiture terrasse",

    u: 0.30,

    inertie: "forte",

  },

  {

    id: "toiture_non_isolee",

    nom: "Toiture non isolée",

    u: 2.20,

    inertie: "forte",

  },

  {

    id: "bac_acier",

    nom: "Bac acier",

    u: 0.35,

    inertie: "faible",

  }

];