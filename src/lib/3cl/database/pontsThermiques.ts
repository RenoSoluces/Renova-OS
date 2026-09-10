export interface PontThermique {

  id: string

  nom: string

  psi: number

}

export const PONTS_THERMIQUES: PontThermique[] = [

  {

    id: "mur_plancher",

    nom: "Mur / Plancher bas",

    psi: 0.45,

  },

  {

    id: "mur_toiture",

    nom: "Mur / Toiture",

    psi: 0.20,

  },

  {

    id: "mur_refend",

    nom: "Mur / Refend",

    psi: 0.15,

  },

  {

    id: "linteau",

    nom: "Linteau",

    psi: 0.35,

  },

  {

    id: "tableau",

    nom: "Tableau",

    psi: 0.22,

  },

  {

    id: "balcon",

    nom: "Balcon",

    psi: 0.95,

  },

]