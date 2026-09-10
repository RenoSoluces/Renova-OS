export interface TravailRenovation {

  id: string;

  nom: string;

  coutM2: number;

  duree: number;

}

export const TRAVAUX: TravailRenovation[] = [

  {

    id: "combles",

    nom: "Isolation des combles",

    coutM2: 55,

    duree: 1,

  },

  {

    id: "ite",

    nom: "Isolation Thermique Extérieure",

    coutM2: 180,

    duree: 5,

  },

  {

    id: "menuiseries",

    nom: "Remplacement des fenêtres",

    coutM2: 650,

    duree: 2,

  },

  {

    id: "pac",

    nom: "Pompe à chaleur",

    coutM2: 0,

    duree: 2,

  },

  {

    id: "vmc",

    nom: "VMC Hygro B",

    coutM2: 0,

    duree: 1,

  }

];