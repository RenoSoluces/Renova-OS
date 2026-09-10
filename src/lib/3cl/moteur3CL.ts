import { Batiment3CL } from "./batiment3CL";

import { calculDPE } from "./calculDPE";

import { analyseMaison } from "./analyse/analyseMaison";

import { proposerTravaux } from "./analyse/proposerTravaux";

// Petit utilitaire d'UI (couleur d'étiquette DPE), utilisé par DpeVisualizer.
export function dpeColor(letter: string): string {
  const colors: Record<string, string> = {
    A: "#00a651", B: "#4cb848", C: "#aed136", D: "#fff200",
    E: "#fdb913", F: "#f7941d", G: "#ed1c24",
  };
  return colors[letter] || "#cccccc";
}

// Estimation rapide du U d'un mur pendant la saisie (avant que la fiche soit complète),
// utilisée par Section03Murs pour un aperçu en direct. Reprend la même logique physique que
// calculUParoi (R en série) sur un cas simplifié mur uniquement.
const U_BASE_MUR: Record<string, number> = {
  pierre: 2.5, beton: 2.8, parpaing: 2.6, brique: 2.2, bois: 1.8, "beton_cellulaire": 1.4,
};

export function calculerUValue(
  composition: string | undefined,
  isole: string | null | undefined,
  epaisseurIsolantCm: number | null | undefined,
  _isolantType?: string | null // réservé pour une future différenciation par type d'isolant (lambda variable)
): number {
  const base = (composition && U_BASE_MUR[composition.toLowerCase()]) || 2.3;
  if (isole !== "oui") return Math.round(base * 100) / 100;
  const epaisseurM = (epaisseurIsolantCm && epaisseurIsolantCm > 0 ? epaisseurIsolantCm : 10) / 100;
  const lambda = 0.038;
  const rTotal = 1 / base + epaisseurM / lambda;
  return Math.round((1 / rTotal) * 100) / 100;
}

export interface ResultatMoteur3CL {

  batiment: Batiment3CL;

  dpe: ReturnType<typeof calculDPE>;

  analyse: ReturnType<typeof analyseMaison>;

  travaux: ReturnType<typeof proposerTravaux>;

}

export function moteur3CL(

  batiment: Batiment3CL

): ResultatMoteur3CL {

  const dpe =
    calculDPE(batiment);

  const analyse =
    analyseMaison(batiment);

  const travaux =
    proposerTravaux(batiment);

  return {

    batiment,

    dpe,

    analyse,

    travaux,

  };

}