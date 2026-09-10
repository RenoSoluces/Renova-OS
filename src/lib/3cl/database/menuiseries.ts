export interface Menuiserie {

  id: string;

  nom: string;

  uf: number;

  facteurPontThermique: number;

}

export const MENUISERIES: Menuiserie[] = [

  {

    id: "bois",

    nom: "Bois",

    uf: 1.4,

    facteurPontThermique: 0.05,

  },

  {

    id: "pvc",

    nom: "PVC",

    uf: 1.3,

    facteurPontThermique: 0.04,

  },

  {

    id: "alu_rpt",

    nom: "Aluminium RPT",

    uf: 1.8,

    facteurPontThermique: 0.06,

  },

  {

    id: "alu",

    nom: "Aluminium",

    uf: 2.8,

    facteurPontThermique: 0.12,

  },

  {

    id: "acier",

    nom: "Acier",

    uf: 2.2,

    facteurPontThermique: 0.09,

  },

  {

    id: "mixte",

    nom: "Bois / Aluminium",

    uf: 1.5,

    facteurPontThermique: 0.05,

  }

];