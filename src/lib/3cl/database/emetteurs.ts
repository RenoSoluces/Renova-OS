export interface Emetteur {

  id: string;

  nom: string;

  rendement: number;

  inertie: "faible" | "moyenne" | "forte";

}

export const EMETTEURS: Emetteur[] = [

  {
    id: "radiateur",
    nom: "Radiateurs",
    rendement: 0.97,
    inertie: "moyenne",
  },

  {
    id: "plancher_chauffant",
    nom: "Plancher chauffant",
    rendement: 0.99,
    inertie: "forte",
  },

  {
    id: "ventilo_convecteur",
    nom: "Ventilo-convecteurs",
    rendement: 0.95,
    inertie: "faible",
  },

  {
    id: "soufflage",
    nom: "Soufflage air chaud",
    rendement: 0.92,
    inertie: "faible",
  }

];