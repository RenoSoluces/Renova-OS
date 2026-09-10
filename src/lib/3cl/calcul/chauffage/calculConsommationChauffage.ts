import { Batiment3CL } from "../../batiment3CL";

import { calculBesoinChauffage } from "./calculBesoinChauffage";
import { calculGeneration } from "./calculGeneration";
import { calculDistribution } from "./calculDistribution";
import { calculEmission } from "./calculEmission";
import { calculRegulation } from "./calculRegulation";
import { calculInertieBatiment } from "../../physique/calculInertie";
import { calculIntermittence } from "../../physique/calculIntermittence";

import { CHAUFFAGES } from "../../database/chauffages";
import { ENERGIES } from "../../database/energies";

export interface ResultatConsommationChauffage {

  besoin: number;

  consommationFinale: number;

  consommationEP: number;

  emissionsCO2: number;

}

export function calculConsommationChauffage(

  batiment: Batiment3CL

): ResultatConsommationChauffage {

  // Besoin annuel (calcul mensuel, hors intermittence)

  const resultatBesoin =
    calculBesoinChauffage(batiment);

  // Facteur d'intermittence INT (§8) : Cch = Bch * INT * Ich

  const inertie =
    calculInertieBatiment(batiment);

  const intermittence =
    calculIntermittence(
      batiment,
      resultatBesoin.hTotal,
      inertie
    );

  const besoin =
    resultatBesoin.besoinAnnuel *
    intermittence;

  // Générateur

  const systeme =
    batiment.chauffage?.systeme_principal ??
    "radiateur_electrique";

  const generation =
    calculGeneration(
      batiment,
      besoin,
      systeme
    );

  // Distribution

  const distribution =
    calculDistribution(
      generation.consommationGeneration,
      "radiateurs"
    );

  // Emission

  const emission =
    calculEmission(
      distribution.consommationDistribution,
      "radiateur"
    );

  // Régulation

  const regulation =
    calculRegulation(
      emission.consommationEmission,
      "thermostat"
    );

  // Consommation finale du poste chauffage (générateur + distribution + émission +
  // régulation). Les auxiliaires (circulateurs, ventilateurs) sont comptés une seule
  // fois, au niveau global du DPE (voir calculDPE.ts), avec le facteur de conversion
  // de l'ÉLECTRICITÉ — car ce sont quasi systématiquement des équipements électriques,
  // même sur une chaudière gaz ou fioul. Les additionner ici aussi les compterait deux
  // fois, et avec le facteur du vecteur énergétique du chauffage (ex: gaz = 1) au lieu
  // de celui de l'électricité (1,9) pour les systèmes non électriques.

  const consommationFinale =
    regulation.consommationRegulee;

  // Facteurs EP / GES : dépendent du VECTEUR ÉNERGÉTIQUE (électricité, gaz, fioul...),
  // pas de l'équipement lui-même — d'où le passage par la base ENERGIES.

  const chauffage =
    CHAUFFAGES.find(
      c => c.id === systeme
    );

  const energie =
    ENERGIES.find(
      e => e.id === chauffage?.energie
    );

  const facteurEP =
    energie?.facteurEP ?? 1;

  const facteurGES =
    energie?.facteurCO2 ?? 0;

  return {

    besoin: Math.round(besoin),

    consommationFinale:
      Math.round(consommationFinale),

    consommationEP:
      Math.round(
        consommationFinale *
        facteurEP
      ),

    emissionsCO2:
      Math.round(
        consommationFinale *
        facteurGES
      ),

  };

}