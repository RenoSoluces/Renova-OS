// Facteur solaire Sw des fenêtres / portes-fenêtres — méthode 3CL-DPE 2021, annexe 1, §6.2.1
// Source : arrêté du 31 mars 2021, tableau "Sw Fenêtre ou porte-fenêtre au nu extérieur"
// Valeurs reprises verbatim du texte officiel.

export type MateriauMenuiserie = "bois" | "pvc" | "metal_rpt" | "metal";
export type TypeVitrage = "simple" | "double" | "double_vir" | "triple" | "triple_vir";
export type TypeOuverture = "battante" | "coulissante";

// Sw pour une menuiserie posée au nu extérieur (position la plus fréquente en rénovation)
const SW_NU_EXTERIEUR: Record<MateriauMenuiserie, Record<TypeVitrage, number>> = {
  bois: {
    simple: 0.58,
    double: 0.52,
    double_vir: 0.45,
    triple: 0.46,
    triple_vir: 0.41,
  },
  pvc: {
    simple: 0.54,
    double: 0.48,
    double_vir: 0.42,
    triple: 0.43,
    triple_vir: 0.39,
  },
  metal_rpt: {
    // métal à rupture de pont thermique
    simple: 0.59,
    double: 0.53,
    double_vir: 0.46,
    triple: 0.47,
    triple_vir: 0.42,
  },
  metal: {
    simple: 0.61,
    double: 0.55,
    double_vir: 0.48,
    triple: 0.49,
    triple_vir: 0.44,
  },
};

export function getFacteurSolaire(
  materiau: MateriauMenuiserie,
  vitrage: TypeVitrage
): number {
  return SW_NU_EXTERIEUR[materiau]?.[vitrage] ?? 0.5;
}

// Coefficient d'orientation et d'inclinaison C1 (§18.5 de l'annexe officielle).
// ATTENTION : le tableau officiel donne 12 valeurs mensuelles par orientation, basées sur
// des données d'ensoleillement mesurées. Ces valeurs précises n'ont pas pu être extraites
// de façon fiable dans cette session (table volumineuse, risque d'erreur de transcription).
// En attendant, on utilise une approximation physique raisonnable (profil saisonnier
// sinusoïdal, plus favorable au Sud en hiver, plus favorable à l'Est/Ouest en été) —
// à REMPLACER par le tableau officiel §18.5 pour une conformité réglementaire complète.
const MOIS_ANGLE = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345]; // milieu de mois, jours depuis solstice hiver approx

export function coefficientC1Approx(
  orientation: "nord" | "sud" | "est" | "ouest",
  mois: number // 1-12
): number {
  // Profil approximatif : le Sud reçoit son maximum en hiver, le Nord est quasi plat et faible toute l'année
  const t = (MOIS_ANGLE[mois - 1] / 360) * 2 * Math.PI;
  switch (orientation) {
    case "sud":
      return 0.55 + 0.25 * Math.cos(t); // fort en hiver
    case "nord":
      return 0.25;
    case "est":
    case "ouest":
      return 0.35 + 0.15 * Math.sin(t);
    default:
      return 0.4;
  }
}
