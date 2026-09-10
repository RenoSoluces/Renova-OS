export interface Energie {

  id: string;

  nom: string;

  facteurEP: number;

  facteurCEF: number;

  facteurCO2: number;

  renouvelable: boolean;

}

export const ENERGIES: Energie[] = [

  {
    id: "electricite",
    nom: "Electricité",
    facteurEP: 1.9,
    facteurCEF: 1,
    facteurCO2: 0.079,
    renouvelable: false,
  },

  {
    id: "gaz_naturel",
    nom: "Gaz naturel",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.227,
    renouvelable: false,
  },

  {
    id: "fioul",
    nom: "Fioul",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.324,
    renouvelable: false,
  },

  {
    id: "propane",
    nom: "Propane",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.272,
    renouvelable: false,
  },

  {
    id: "bois_buches",
    nom: "Bois bûches",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.03,
    renouvelable: true,
  },

  {
    id: "granules",
    nom: "Granulés",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.026,
    renouvelable: true,
  },

  {
    id: "reseau_chaleur",
    nom: "Réseau de chaleur",
    facteurEP: 1,
    facteurCEF: 1,
    facteurCO2: 0.12,
    renouvelable: false,
  },

];