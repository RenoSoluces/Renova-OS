import { Batiment3CL } from "../batiment3CL";
import {
  classeInertieBatiment,
  ClasseInertie,
} from "../database/inertie";

function estLourd(inertie: string): boolean {

  return (
    inertie === "lourde" ||
    inertie === "forte"
  );

}

function majoriteLourde(
  parois: {
    surface: number;
    inertie: string;
  }[]
): boolean {

  if (parois.length === 0) {

    return false;

  }

  const surfaceTotale =
    parois.reduce(
      (s, p) => s + p.surface,
      0
    );

  if (surfaceTotale === 0) {

    return false;

  }

  const surfaceLourde =
    parois
      .filter(p => estLourd(p.inertie))
      .reduce(
        (s, p) => s + p.surface,
        0
      );

  return (
    surfaceLourde /
    surfaceTotale >=
    0.50
  );

}

export function calculInertieBatiment(
  batiment: Batiment3CL
): ClasseInertie {

  const mursLourds =
    majoriteLourde(
      batiment.murs
    );

  const plancherBasLourd =
    majoriteLourde(
      batiment.planchers
    );

  const toitureLourde =
    majoriteLourde(
      batiment.toitures
    );

  return classeInertieBatiment(

    plancherBasLourd,

    toitureLourde,

    mursLourds

  );

}