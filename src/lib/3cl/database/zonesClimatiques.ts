export interface ZoneClimatique {

  code: string

  nom: string

  dju: number

}

export const ZONES_CLIMATIQUES = [

  {

    code: "H1a",

    nom: "Nord Est",

    dju: 3000,

  },

  {

    code: "H1b",

    nom: "Nord",

    dju: 2800,

  },

  {

    code: "H1c",

    nom: "Est",

    dju: 2600,

  },

  {

    code: "H2a",

    nom: "Centre",

    dju: 2200,

  },

  {

    code: "H2b",

    nom: "Sud Ouest",

    dju: 2000,

  },

  {

    code: "H2c",

    nom: "Atlantique",

    dju: 1800,

  },

  {

    code: "H2d",

    nom: "Corse",

    dju: 1600,

  },

  {

    code: "H3",

    nom: "Méditerranée",

    dju: 1300,

  }

]