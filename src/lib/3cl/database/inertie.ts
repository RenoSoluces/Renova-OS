// Détermination de l'inertie du bâtiment — méthode 3CL-DPE 2021, annexe 1, §7
// Table §7.4 reprise verbatim du texte officiel (arrêté du 31 mars 2021).

export type ClasseInertie = "legere" | "moyenne" | "lourde" | "tres_lourde";

// §7.4 : combinaison plancher bas lourd / plancher haut lourd / paroi verticale lourde -> classe
export function classeInertieBatiment(
  planchesBasLourd: boolean,
  plancherHautLourd: boolean,
  paroiVerticaleLourde: boolean
): ClasseInertie {
  if (planchesBasLourd && plancherHautLourd && paroiVerticaleLourde) return "tres_lourde";
  if (plancherHautLourd && paroiVerticaleLourde) return "lourde";
  if (planchesBasLourd && paroiVerticaleLourde) return "lourde";
  if (planchesBasLourd && plancherHautLourd) return "lourde";
  if (paroiVerticaleLourde) return "moyenne";
  if (plancherHautLourd) return "moyenne";
  if (planchesBasLourd) return "moyenne";
  return "legere";
}

// §7.3 : une paroi verticale (mur) est "lourde" si elle est non isolée ou isolée par
// l'extérieur (ITE) et constituée d'un matériau lourd (béton, brique pleine/perforée,
// pierre, terre, mur sandwich béton/isolant/béton...). Un mur isolé par l'intérieur (ITI)
// n'est PAS considéré comme paroi lourde côté ambiance intérieure (l'isolant interne
// déconnecte thermiquement la masse du mur de l'ambiance).
// Le wizard capture directement `mur_lourd` (oui/non) sur chaque mur : on s'appuie dessus
// plutôt que de re-déduire la nature du matériau, ce qui est fiable et déjà collecté sur le terrain.

// §7.1/§7.2 : un plancher haut ou plancher bas est "lourd" s'il est en béton plein /
// poutrelles-hourdis (non isolé ou isolé par l'extérieur, sans faux-plafond isolant).
// Par défaut réglementaire : un plancher haut inconnu est considéré à inertie LÉGÈRE,
// un plancher bas (hors terre-plein) inconnu est considéré à inertie LOURDE.
export const DEFAUT_PLANCHER_HAUT_LOURD = false;
export const DEFAUT_PLANCHER_BAS_LOURD = true;
