import { Batiment3CL } from "../../batiment3CL";

export interface ResultatInfiltration {
  coefficient: number;
  volume: number;
  hInfiltration: number;
}

const COEFFICIENTS = {
  AVANT_1948: 1.30,
  DE_1948_A_1974: 1.10,
  DE_1975_A_1989: 0.90,
  DE_1990_A_2005: 0.70,
  DE_2006_A_2012: 0.50,
  APRES_2012: 0.30,
};

function obtenirCoefficientInfiltration(
  anneeConstruction: number
): number {

  if (anneeConstruction < 1948) {
    return COEFFICIENTS.AVANT_1948;
  }

  if (anneeConstruction < 1975) {
    return COEFFICIENTS.DE_1948_A_1974;
  }

  if (anneeConstruction < 1990) {
    return COEFFICIENTS.DE_1975_A_1989;
  }

  if (anneeConstruction < 2006) {
    return COEFFICIENTS.DE_1990_A_2005;
  }

  if (anneeConstruction < 2013) {
    return COEFFICIENTS.DE_2006_A_2012;
  }

  return COEFFICIENTS.APRES_2012;
}

export function calculInfiltration(
  batiment: Batiment3CL
): ResultatInfiltration {

  const coefficient =
    obtenirCoefficientInfiltration(
      batiment.anneeConstruction
    );

  const volume =
    batiment.volumeChauffe;

  /**
   * Déperditions par infiltration
   *
   * H = 0.34 × n × V
   *
   * 0.34 = capacité thermique volumique de l'air
   * n = renouvellement parasite (vol/h)
   * V = volume chauffé (m³)
   */

  const hInfiltration =
    0.34 *
    coefficient *
    volume;

  return {

    coefficient,

    volume,

    hInfiltration:
      Math.round(hInfiltration * 100) / 100,

  };

}