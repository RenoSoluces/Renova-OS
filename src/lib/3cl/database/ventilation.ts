export interface Ventilation {

  id: string

  nom: string

  renouvellement: number

}

export const VENTILATIONS: Ventilation[] = [

  {
    id: "naturelle",
    nom: "Naturelle",
    renouvellement: 1.30,
  },

  {
    id: "vmc_sf",
    nom: "VMC Simple Flux",
    renouvellement: 0.60,
  },

  {
    id: "vmc_hygro_a",
    nom: "VMC Hygro A",
    renouvellement: 0.50,
  },

  {
    id: "vmc_hygro_b",
    nom: "VMC Hygro B",
    renouvellement: 0.45,
  },

  {
    id: "vmc_df",
    nom: "VMC Double Flux",
    renouvellement: 0.25,
  }

]