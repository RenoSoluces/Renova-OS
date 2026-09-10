export interface Vitrage {

  id: string;

  nom: string;

  type:
    | "simple"
    | "double"
    | "triple";

  ug: number;          // W/m².K

  uw: number;          // W/m².K

  sw: number;          // Facteur solaire

  tlw: number;         // Transmission lumineuse

}

export const VITRAGES: Vitrage[] = [

  {
    id: "simple",
    nom: "Simple vitrage",
    type: "simple",
    ug: 5.8,
    uw: 5.4,
    sw: 0.85,
    tlw: 0.90,
  },

  {
    id: "double_46_4",
    nom: "Double vitrage 4/6/4",
    type: "double",
    ug: 3.0,
    uw: 2.9,
    sw: 0.76,
    tlw: 0.82,
  },

  {
    id: "double_412_4",
    nom: "Double vitrage 4/12/4",
    type: "double",
    ug: 2.8,
    uw: 2.7,
    sw: 0.74,
    tlw: 0.81,
  },

  {
    id: "double_argon",
    nom: "Double vitrage Argon",
    type: "double",
    ug: 1.3,
    uw: 1.5,
    sw: 0.63,
    tlw: 0.79,
  },

  {
    id: "double_itr",
    nom: "Double vitrage ITR",
    type: "double",
    ug: 1.1,
    uw: 1.3,
    sw: 0.60,
    tlw: 0.78,
  },

  {
    id: "triple",
    nom: "Triple vitrage",
    type: "triple",
    ug: 0.8,
    uw: 1.0,
    sw: 0.52,
    tlw: 0.72,
  },

  {
    id: "triple_argon",
    nom: "Triple vitrage Argon",
    type: "triple",
    ug: 0.7,
    uw: 0.9,
    sw: 0.50,
    tlw: 0.70,
  },

  {
    id: "triple_krypton",
    nom: "Triple vitrage Krypton",
    type: "triple",
    ug: 0.5,
    uw: 0.7,
    sw: 0.47,
    tlw: 0.69,
  }

];