export interface Chauffage {

  id: string;

  nom: string;

  energie: string;

  rendementGeneration: number;

  rendementDistribution: number;

  rendementEmission: number;

  rendementRegulation: number;

}

export const CHAUFFAGES: Chauffage[] = [

  /*
   * ---------------------------------------------------------
   * ELECTRIQUE
   * ---------------------------------------------------------
   */

  {
    id: "radiateur_electrique",
    nom: "Radiateurs électriques",
    energie: "electricite",
    rendementGeneration: 1,
    rendementDistribution: 1,
    rendementEmission: 1,
    rendementRegulation: 0.95,
  },

  /*
   * ---------------------------------------------------------
   * PAC AIR / EAU
   * ---------------------------------------------------------
   */

  {
    id: "pac_air_eau",
    nom: "Pompe à chaleur air/eau",
    energie: "electricite",
    rendementGeneration: 3.2,
    rendementDistribution: 0.95,
    rendementEmission: 0.95,
    rendementRegulation: 0.95,
  },

  /*
   * ---------------------------------------------------------
   * PAC AIR / AIR
   * ---------------------------------------------------------
   */

  {
    id: "pac_air_air",
    nom: "Pompe à chaleur air/air",
    energie: "electricite",
    rendementGeneration: 3.5,
    rendementDistribution: 1,
    rendementEmission: 1,
    rendementRegulation: 0.95,
  },

  /*
   * ---------------------------------------------------------
   * CHAUDIERE GAZ
   * ---------------------------------------------------------
   */

  {
    id: "chaudiere_gaz",
    nom: "Chaudière gaz",
    energie: "gaz_naturel",
    rendementGeneration: 0.90,
    rendementDistribution: 0.90,
    rendementEmission: 0.95,
    rendementRegulation: 0.95,
  },

  /*
   * ---------------------------------------------------------
   * CHAUDIERE GAZ CONDENSATION
   * ---------------------------------------------------------
   */

  {
    id: "chaudiere_gaz_condensation",
    nom: "Chaudière gaz à condensation",
    energie: "gaz_naturel",
    rendementGeneration: 0.98,
    rendementDistribution: 0.95,
    rendementEmission: 0.95,
    rendementRegulation: 0.95,
  },

  /*
   * ---------------------------------------------------------
   * CHAUDIERE FIOUL
   * ---------------------------------------------------------
   */

  {
    id: "chaudiere_fioul",
    nom: "Chaudière fioul",
    energie: "fioul",
    rendementGeneration: 0.85,
    rendementDistribution: 0.90,
    rendementEmission: 0.95,
    rendementRegulation: 0.90,
  },

  /*
   * ---------------------------------------------------------
   * POELE BOIS
   * ---------------------------------------------------------
   */

  {
    id: "poele_bois",
    nom: "Poêle à bois",
    energie: "bois_buches",
    rendementGeneration: 0.75,
    rendementDistribution: 1,
    rendementEmission: 1,
    rendementRegulation: 0.85,
  },

  /*
   * ---------------------------------------------------------
   * POELE GRANULES
   * ---------------------------------------------------------
   */

  {
    id: "poele_granules",
    nom: "Poêle à granulés",
    energie: "granules",
    rendementGeneration: 0.90,
    rendementDistribution: 1,
    rendementEmission: 1,
    rendementRegulation: 0.90,
  },

  /*
   * ---------------------------------------------------------
   * INSERT BOIS
   * ---------------------------------------------------------
   */

  {
    id: "insert_bois",
    nom: "Insert bois",
    energie: "bois_buches",
    rendementGeneration: 0.70,
    rendementDistribution: 1,
    rendementEmission: 1,
    rendementRegulation: 0.80,
  },

  /*
   * ---------------------------------------------------------
   * RESEAU DE CHALEUR
   * ---------------------------------------------------------
   */

  {
    id: "reseau_chaleur",
    nom: "Réseau de chaleur",
    energie: "reseau_chaleur",
    rendementGeneration: 0.95,
    rendementDistribution: 0.90,
    rendementEmission: 0.95,
    rendementRegulation: 0.95,
  },

];