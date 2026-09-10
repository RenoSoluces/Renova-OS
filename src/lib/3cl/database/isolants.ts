export interface Isolant {

  id: string;

  nom: string;

  lambda: number;          // W/m.K

  densite: number;         // kg/m³

  chaleurSpecifique: number; // J/kg.K

  mu: number;              // facteur vapeur

  categorie:
    | "minerale"
    | "synthetique"
    | "biosource";

}

export const ISOLANTS: Isolant[] = [

  // MINÉRAUX

  {
    id: "laine_verre",
    nom: "Laine de verre",
    lambda: 0.035,
    densite: 20,
    chaleurSpecifique: 1030,
    mu: 1,
    categorie: "minerale",
  },

  {
    id: "laine_roche",
    nom: "Laine de roche",
    lambda: 0.036,
    densite: 40,
    chaleurSpecifique: 1030,
    mu: 1,
    categorie: "minerale",
  },

  {
    id: "verre_cellulaire",
    nom: "Verre cellulaire",
    lambda: 0.041,
    densite: 120,
    chaleurSpecifique: 840,
    mu: 7,
    categorie: "minerale",
  },

  // SYNTHÉTIQUES

  {
    id: "eps",
    nom: "Polystyrène expansé (EPS)",
    lambda: 0.038,
    densite: 20,
    chaleurSpecifique: 1400,
    mu: 50,
    categorie: "synthetique",
  },

  {
    id: "xps",
    nom: "Polystyrène extrudé (XPS)",
    lambda: 0.030,
    densite: 35,
    chaleurSpecifique: 1450,
    mu: 150,
    categorie: "synthetique",
  },

  {
    id: "pur",
    nom: "Polyuréthane (PUR)",
    lambda: 0.024,
    densite: 35,
    chaleurSpecifique: 1470,
    mu: 60,
    categorie: "synthetique",
  },

  {
    id: "pir",
    nom: "Polyisocyanurate (PIR)",
    lambda: 0.023,
    densite: 32,
    chaleurSpecifique: 1450,
    mu: 60,
    categorie: "synthetique",
  },

  {
    id: "phenolique",
    nom: "Mousse phénolique",
    lambda: 0.021,
    densite: 40,
    chaleurSpecifique: 1400,
    mu: 45,
    categorie: "synthetique",
  },

  // BIOSOURCÉS

  {
    id: "ouate_cellulose",
    nom: "Ouate de cellulose",
    lambda: 0.039,
    densite: 55,
    chaleurSpecifique: 2100,
    mu: 2,
    categorie: "biosource",
  },

  {
    id: "fibre_bois",
    nom: "Fibre de bois",
    lambda: 0.039,
    densite: 55,
    chaleurSpecifique: 2100,
    mu: 5,
    categorie: "biosource",
  },

  {
    id: "laine_bois",
    nom: "Laine de bois",
    lambda: 0.038,
    densite: 50,
    chaleurSpecifique: 2100,
    mu: 5,
    categorie: "biosource",
  },

  {
    id: "chanvre",
    nom: "Chanvre",
    lambda: 0.040,
    densite: 38,
    chaleurSpecifique: 1800,
    mu: 1,
    categorie: "biosource",
  },

  {
    id: "lin",
    nom: "Lin",
    lambda: 0.039,
    densite: 32,
    chaleurSpecifique: 1800,
    mu: 1,
    categorie: "biosource",
  },

  {
    id: "liege",
    nom: "Liège expansé",
    lambda: 0.040,
    densite: 120,
    chaleurSpecifique: 1800,
    mu: 10,
    categorie: "biosource",
  },

  {
    id: "coton",
    nom: "Coton recyclé",
    lambda: 0.039,
    densite: 28,
    chaleurSpecifique: 1600,
    mu: 2,
    categorie: "biosource",
  },

  {
    id: "laine_mouton",
    nom: "Laine de mouton",
    lambda: 0.038,
    densite: 25,
    chaleurSpecifique: 1700,
    mu: 1,
    categorie: "biosource",
  },

  {
    id: "plume_canard",
    nom: "Plumes de canard",
    lambda: 0.037,
    densite: 24,
    chaleurSpecifique: 1700,
    mu: 1,
    categorie: "biosource",
  },

  {
    id: "roseaux",
    nom: "Roseaux",
    lambda: 0.050,
    densite: 180,
    chaleurSpecifique: 1600,
    mu: 3,
    categorie: "biosource",
  }

];