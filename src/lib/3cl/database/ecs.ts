export interface SystemeECS {

  id: string;

  nom: string;

  energie: string;

  rendement: number;

  facteurEP: number;

  facteurGES: number;

  cop?: number;

  stockage: boolean;

}

export const SYSTEMES_ECS: SystemeECS[] = [

  {

    id: "ballon_electrique",

    nom: "Ballon électrique",

    energie: "electricite",

    rendement: 0.92,

    facteurEP: 1.9,

    facteurGES: 0.079,

    stockage: true,

  },

  {

    id: "ballon_thermodynamique",

    nom: "Ballon thermodynamique",

    energie: "electricite",

    rendement: 1,

    cop: 2.8,

    facteurEP: 1.9,

    facteurGES: 0.079,

    stockage: true,

  },

  {

    id: "ecs_gaz",

    nom: "ECS Gaz",

    energie: "gaz",

    rendement: 0.88,

    facteurEP: 1,

    facteurGES: 0.227,

    stockage: true,

  },

  {

    id: "ecs_solaire",

    nom: "CESI",

    energie: "solaire",

    rendement: 1,

    facteurEP: 0,

    facteurGES: 0,

    cop: 5,

    stockage: true,

  },

  {

    id: "instantane",

    nom: "Instantané",

    energie: "electricite",

    rendement: 0.98,

    facteurEP: 1.9,

    facteurGES: 0.079,

    stockage: false,

  }

];