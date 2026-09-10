import { ZONES_CLIMATIQUES } from "./zonesClimatiques";

// ============================================================================
// AVERTISSEMENT IMPORTANT
// ============================================================================
// La méthode 3CL-DPE officielle (annexe 1, §18.2) fournit des tables MENSUELLES
// exactes de degrés-heures (DH19), de durée de chauffe (Nref) et d'ensoleillement
// (E) pour chacune des 8 zones climatiques, sur 3 tranches d'altitude. Cette table
// fait plusieurs pages et n'a pas pu être extraite de façon fiable et vérifiée
// dans cette session (risque de transcription erronée sur des chiffres réglementaires).
//
// En attendant, ce module DISTRIBUE la valeur de DJU annuelle déjà présente dans
// database/zonesClimatiques.ts sur une saison de chauffe (Oct->Mai) avec un profil
// mensuel physiquement raisonnable (plus rigoureux en Janvier, nul en été). C'est
// une AMÉLIORATION par rapport à l'ancien calcul (DJU annuel appliqué uniformément
// sans tenir compte des apports solaires/internes mois par mois), mais ce n'est PAS
// encore la table officielle. À remplacer dès que la table exacte est disponible.
// ============================================================================

// Poids mensuel relatif de la rigueur climatique (somme = 1), saison de chauffe Oct->Mai
const POIDS_MOIS_CHAUFFE: Record<number, number> = {
  1: 0.185,  // Janvier - mois le plus froid
  2: 0.155,  // Février
  3: 0.115,  // Mars
  4: 0.06,   // Avril
  5: 0.02,   // Mai
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0.055, // Octobre
  11: 0.125, // Novembre
  12: 0.185, // Décembre
};

// Nombre d'heures de chauffe conventionnel par mois (proportionnel à la rigueur du mois,
// sur une base annuelle totale d'environ 5100h à consigne 19°C - ordre de grandeur usuel)
const NREF_ANNUEL_BASE = 5100;

// Ensoleillement mensuel reçu par une paroi verticale Sud (kWh/m²), ordre de grandeur
// France métropolitaine (valeurs approximatives, plus basses en H1/H2, plus hautes en H3)
const ENSOLEILLEMENT_SUD_BASE: Record<number, number> = {
  1: 45, 2: 60, 3: 85, 4: 90, 5: 95, 6: 90,
  7: 100, 8: 105, 9: 90, 10: 65, 11: 42, 12: 38,
};

const FACTEUR_ENSOLEILLEMENT_ZONE: Record<string, number> = {
  H1a: 0.85, H1b: 0.85, H1c: 0.9,
  H2a: 0.9, H2b: 0.95, H2c: 1.0, H2d: 1.05,
  H3: 1.2,
};

export interface DonneesClimatMois {
  mois: number; // 1-12
  dh19: number; // degrés-heures du mois (°Ch)
  nref: number; // nombre d'heures de chauffage du mois (h)
  ensoleillementSud: number; // kWh/m² reçus par une paroi verticale sud dans le mois
}

export function donneesClimatMensuelles(zoneClimatique: string): DonneesClimatMois[] {

  const zone = ZONES_CLIMATIQUES.find((z) => z.code === zoneClimatique);
  const djuAnnuel = zone?.dju ?? 2200;
  const dhAnnuel = djuAnnuel * 24; // même convention que l'ancien calcul annuel

  const facteurSoleil = FACTEUR_ENSOLEILLEMENT_ZONE[zoneClimatique] ?? 1.0;

  const mois: DonneesClimatMois[] = [];

  for (let m = 1; m <= 12; m++) {
    const poids = POIDS_MOIS_CHAUFFE[m];
    mois.push({
      mois: m,
      dh19: Math.round(dhAnnuel * poids),
      nref: Math.round(NREF_ANNUEL_BASE * poids),
      ensoleillementSud: Math.round(ENSOLEILLEMENT_SUD_BASE[m] * facteurSoleil * 10) / 10,
    });
  }

  return mois;
}
