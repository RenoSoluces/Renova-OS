import { Batiment3CL } from "../batiment3CL";
import { coefficientC1Approx } from "../database/facteurSolaire";

function orientationNormalisee(
  orientation: string
): "nord" | "sud" | "est" | "ouest" {

  const o = (orientation ?? "").toLowerCase();

  if (o.includes("sud")) return "sud";
  if (o.includes("nord")) return "nord";
  if (o.includes("est") && !o.includes("ouest")) return "est";
  if (o.includes("ouest")) return "ouest";

  return "sud";

}

/**
 * Surface Sud Equivalente
 *
 * Sse = Σ(surface × Sw × Fe × C1)
 *
 * Sw est directement stocké dans ParoiMenuiserie.
 * Fe = 1 tant que les masques ne sont pas renseignés.
 */
export function calculSurfaceSudEquivalenteMois(
  batiment: Batiment3CL,
  mois: number
): number {

  return batiment.menuiseries.reduce((total, fenetre) => {

    const orientation =
      orientationNormalisee(
        fenetre.orientation
      );

    const c1 =
      coefficientC1Approx(
        orientation,
        mois
      );

    const fe = 1;

    return (
      total +
      fenetre.surface *
      fenetre.sw *
      fe *
      c1
    );

  }, 0);

}

/**
 * Apports solaires mensuels
 *
 * As = 1000 × Sse × Ensoleillement
 */
export function calculApportsSolairesMois(
  batiment: Batiment3CL,
  mois: number,
  ensoleillementSudMois: number
): number {

  const sse =
    calculSurfaceSudEquivalenteMois(
      batiment,
      mois
    );

  return (
    1000 *
    sse *
    ensoleillementSudMois
  );

}