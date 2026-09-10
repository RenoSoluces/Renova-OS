export interface Materiau {

  id: string;

  nom: string;

  categorie:
    | "mur"
    | "plancher"
    | "toiture"
    | "mixte";

  lambda: number;          // W/m.K

  densite: number;         // kg/m3

  chaleurSpecifique: number; // J/kg.K

  resistanceSurface?: number;

  inertie:
    | "faible"
    | "moyenne"
    | "forte"
    | "tres_forte";

}

export const MATERIAUX: Materiau[] = [

  {
    id: "brique_pleine",
    nom: "Brique pleine",
    categorie: "mur",
    lambda: 0.84,
    densite: 1800,
    chaleurSpecifique: 840,
    inertie: "forte",
  },

  {
    id: "brique_creuse",
    nom: "Brique creuse",
    categorie: "mur",
    lambda: 0.56,
    densite: 900,
    chaleurSpecifique: 840,
    inertie: "moyenne",
  },

  {
    id: "parpaing",
    nom: "Parpaing",
    categorie: "mur",
    lambda: 1.30,
    densite: 1400,
    chaleurSpecifique: 1000,
    inertie: "forte",
  },

  {
    id: "beton_banche",
    nom: "Béton banché",
    categorie: "mur",
    lambda: 2.30,
    densite: 2400,
    chaleurSpecifique: 1000,
    inertie: "tres_forte",
  },

  {
    id: "beton_cellulaire",
    nom: "Béton cellulaire",
    categorie: "mur",
    lambda: 0.16,
    densite: 500,
    chaleurSpecifique: 1000,
    inertie: "moyenne",
  },

  {
    id: "pierre",
    nom: "Pierre",
    categorie: "mur",
    lambda: 2.00,
    densite: 2200,
    chaleurSpecifique: 900,
    inertie: "tres_forte",
  },

  {
    id: "gres",
    nom: "Grès",
    categorie: "mur",
    lambda: 2.70,
    densite: 2300,
    chaleurSpecifique: 900,
    inertie: "tres_forte",
  },

  {
    id: "granit",
    nom: "Granit",
    categorie: "mur",
    lambda: 3.50,
    densite: 2700,
    chaleurSpecifique: 790,
    inertie: "tres_forte",
  },

  {
    id: "calcaire",
    nom: "Pierre calcaire",
    categorie: "mur",
    lambda: 1.70,
    densite: 2100,
    chaleurSpecifique: 900,
    inertie: "forte",
  },

  {
    id: "pisé",
    nom: "Pisé",
    categorie: "mur",
    lambda: 1.15,
    densite: 1800,
    chaleurSpecifique: 1100,
    inertie: "tres_forte",
  },

  {
    id: "torchis",
    nom: "Torchis",
    categorie: "mur",
    lambda: 0.70,
    densite: 1700,
    chaleurSpecifique: 1100,
    inertie: "forte",
  },

  {
    id: "adobe",
    nom: "Adobe",
    categorie: "mur",
    lambda: 0.80,
    densite: 1650,
    chaleurSpecifique: 1100,
    inertie: "forte",
  },

  {
    id: "bois_massif",
    nom: "Bois massif",
    categorie: "mixte",
    lambda: 0.13,
    densite: 600,
    chaleurSpecifique: 1600,
    inertie: "moyenne",
  },

  {
    id: "ossature_bois",
    nom: "Ossature bois",
    categorie: "mur",
    lambda: 0.12,
    densite: 450,
    chaleurSpecifique: 1600,
    inertie: "faible",
  },

  {
    id: "acier",
    nom: "Acier",
    categorie: "mixte",
    lambda: 50,
    densite: 7850,
    chaleurSpecifique: 460,
    inertie: "tres_forte",
  },

  {
    id: "terre_cuite",
    nom: "Terre cuite",
    categorie: "mur",
    lambda: 0.80,
    densite: 1700,
    chaleurSpecifique: 840,
    inertie: "forte",
  },

  {
    id: "hourdis_beton",
    nom: "Hourdis béton",
    categorie: "plancher",
    lambda: 1.75,
    densite: 2200,
    chaleurSpecifique: 1000,
    inertie: "forte",
  },

  {
    id: "hourdis_polystyrene",
    nom: "Hourdis polystyrène",
    categorie: "plancher",
    lambda: 0.22,
    densite: 450,
    chaleurSpecifique: 1200,
    inertie: "faible",
  },

  {
    id: "dalle_beton",
    nom: "Dalle béton",
    categorie: "plancher",
    lambda: 2.10,
    densite: 2400,
    chaleurSpecifique: 1000,
    inertie: "tres_forte",
  },

  {
    id: "charpente_bois",
    nom: "Charpente bois",
    categorie: "toiture",
    lambda: 0.13,
    densite: 550,
    chaleurSpecifique: 1600,
    inertie: "moyenne",
  },

  {
    id: "bac_acier",
    nom: "Bac acier",
    categorie: "toiture",
    lambda: 50,
    densite: 7850,
    chaleurSpecifique: 460,
    inertie: "faible",
  }

];