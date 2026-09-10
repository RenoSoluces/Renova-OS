export interface ZoneClimatique {

  code: string;

  dju: number;

  altitude: number;

}

export const ZONES = {

  H1a: {

    code: "H1a",

    dju: 3000,

    altitude: 200,

  },

  H1b: {

    code: "H1b",

    dju: 2800,

    altitude: 300,

  },

  H1c: {

    code: "H1c",

    dju: 2600,

    altitude: 250,

  },

  H2a: {

    code: "H2a",

    dju: 2200,

    altitude: 100,

  },

  H2b: {

    code: "H2b",

    dju: 2100,

    altitude: 150,

  },

  H2c: {

    code: "H2c",

    dju: 1900,

    altitude: 80,

  },

  H2d: {

    code: "H2d",

    dju: 1700,

    altitude: 120,

  },

  H3: {

    code: "H3",

    dju: 1300,

    altitude: 20,

  },

};