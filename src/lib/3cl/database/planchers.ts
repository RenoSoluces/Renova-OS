export interface TypePlancher {

  id: string;

  nom: string;

  u: number;

  inertie:
    | "faible"
    | "moyenne"
    | "forte";

}

export const PLANCHERS: TypePlancher[] = [

  {
    id: "terre_plein_non_isole",
    nom: "Terre-plein non isolé",
    u: 1.80,
    inertie: "forte",
  },

  {
    id: "terre_plein_isole",
    nom: "Terre-plein isolé",
    u: 0.38,
    inertie: "forte",
  },

  {
    id: "vide_sanitaire",
    nom: "Vide sanitaire",
    u: 0.55,
    inertie: "forte",
  },

  {
    id: "hourdis_beton",
    nom: "Hourdis béton",
    u: 0.42,
    inertie: "forte",
  },

  {
    id: "hourdis_polystyrene",
    nom: "Hourdis polystyrène",
    u: 0.24,
    inertie: "moyenne",
  },

  {
    id: "plancher_bois",
    nom: "Plancher bois",
    u: 0.45,
    inertie: "moyenne",
  }

];