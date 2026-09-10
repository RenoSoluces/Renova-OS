import { AuditData } from "../../types";

import { calculUParoi } from "./physique/calculUParoi";

import { VITRAGES } from "./database/vitrages";
import { PLANCHERS } from "./database/planchers";
import { TOITURES } from "./database/toitures";
import { zoneClimatiqueDepuisCodePostal } from "./database/departementsZones";

export interface ParoiMur {

  surface: number;

  orientation: string;

  u: number;

  inertie: string;

}

export interface ParoiMenuiserie {

  surface: number;

  orientation: string;

  u: number;

  ug: number;

  uw: number;

  sw: number;

  tlw: number;

}

export interface ParoiPlancher {

  surface: number;

  u: number;

  inertie: string;

}

export interface ParoiToiture {

  surface: number;

  u: number;

  inertie: string;

}

export interface Batiment3CL {

  surfaceHabitable: number;

  volumeChauffe: number;

  hauteurSousPlafond: number;

  anneeConstruction: number;

  typeBatiment: string;

  zoneClimatique: string;

  murs: ParoiMur[];

  menuiseries: ParoiMenuiserie[];

  planchers: ParoiPlancher[];

  toitures: ParoiToiture[];

  chauffage: AuditData["chauffage"];

  ecs: AuditData["ecs"];

  ventilation: AuditData["ventilation"];

}

function surfaceMur(

  longueur?: number | null,

  hauteur?: number | null

): number {

  if (!longueur || !hauteur) return 0;

  return longueur * hauteur;

}

function surfaceMenuiserie(

  largeur?: number | null,

  hauteur?: number | null,

  nombre: number = 1

): number {

  if (!largeur || !hauteur) return 0;

  return largeur * hauteur * nombre;

}

// Le wizard (constants.ts TYPES_MUR_COMPOSITION / TYPES_ISOLANT / TYPES_VITRAGE) utilise des
// identifiants courts qui ne correspondent pas tous exactement aux ids des bases physiques
// (database/materiaux.ts, database/isolants.ts, database/vitrages.ts, plus détaillées).
// Sans cette table de correspondance, calculUParoi() levait une exception sur tout matériau
// non reconnu (paroi "beton", "bois", "metal", "mixte", "inconnu", "meuliere"...), ce qui
// plantait le calcul du DPE pour la quasi-totalité des sélections possibles dans le wizard.
const MAP_MATERIAU_MUR: Record<string, string> = {
  briques_pleines: "brique_pleine",
  briques_creuses: "brique_creuse",
  agglomeres: "parpaing",
  beton: "beton_banche",
  pierre: "pierre",
  meuliere: "pierre", // pas d'entrée dédiée, la meulière est un calcaire proche de "pierre"
  bois: "ossature_bois",
  metal: "acier",
  mixte: "parpaing", // hypothèse médiane faute de mieux
  inconnu: "parpaing", // hypothèse médiane par défaut si le diagnostiqueur ne sait pas
};

const MAP_ISOLANT: Record<string, string> = {
  laine_verre: "laine_verre",
  laine_roche: "laine_roche",
  polystyrene: "eps",
  polyurethane: "pur",
  ouate: "ouate_cellulose",
  chanvre: "chanvre",
  "liège": "liege",
  laine_bois: "laine_bois",
};

const MAP_VITRAGE: Record<string, string> = {
  simple: "simple",
  double: "double_46_4", // double vitrage standard, non spécifié (le plus courant)
  double_fe: "double_argon", // double vitrage à faible émissivité -> lame argon
  triple: "triple",
};

function idMateriauMur(composition: string | undefined): string {
  if (!composition) return "parpaing";
  return MAP_MATERIAU_MUR[composition] ?? "parpaing";
}

function idIsolant(isolantType: string | undefined | null): string | undefined {
  if (!isolantType) return undefined;
  return MAP_ISOLANT[isolantType] ?? undefined; // undefined si non reconnu : ignoré proprement par calculUParoi
}

function idVitrage(vitrage: string | undefined): string {
  if (!vitrage) return "simple";
  return MAP_VITRAGE[vitrage] ?? "simple";
}

function idPlancher(type: string | undefined, isolation: string | undefined): string {
  const isole = isolation === "oui";
  switch (type) {
    case "Terre-plein":
      return isole ? "terre_plein_isole" : "terre_plein_non_isole";
    case "Vide sanitaire":
      return "vide_sanitaire";
    case "Sous-sol":
      return isole ? "hourdis_polystyrene" : "hourdis_beton";
    case "Local non chauffé":
      return isole ? "hourdis_polystyrene" : "plancher_bois";
    default:
      return isole ? "terre_plein_isole" : "terre_plein_non_isole";
  }
}

function idToiture(type: string | undefined, isolation: string | undefined): string {
  const isole = isolation === "oui";
  switch (type) {
    case "Combles perdus":
      return isole ? "combles_perdus" : "toiture_non_isolee";
    case "Rampants":
      return isole ? "combles_amenages" : "toiture_non_isolee";
    case "Toiture terrasse":
      return "toiture_terrasse";
    case "Plafond sous grenier":
      return isole ? "combles_amenages" : "toiture_non_isolee";
    default:
      return isole ? "combles_perdus" : "toiture_non_isolee";
  }
}

// Le wizard (Section07/08/09) affiche des libellés en français ("PAC Air/Eau", "Ballon
// thermodynamique", "Fioul"...) tandis que les bases du moteur (chauffages.ts, ecs.ts,
// energies.ts, ventilation.ts) utilisent des ids courts ("pac_air_eau", "fioul"...). Sans
// cette normalisation, aucun système saisi dans le wizard n'est reconnu par le moteur :
// le calcul retombe sur des valeurs par défaut ou sur des facteurs EP/GES à 0, silencieusement
// (c'est ce qui provoquait des émissions de CO2 nulles pour une chaudière fioul).
const MAP_CHAUFFAGE: Record<string, string> = {
  "radiateurs électriques": "radiateur_electrique",
  "pac air/air": "pac_air_air",
  "pac air/eau": "pac_air_eau",
  "pac géothermique": "pac_air_eau", // pas d'entrée dédiée géothermie dans la base actuelle
  "chaudière gaz": "chaudiere_gaz",
  "chaudière gaz condensation": "chaudiere_gaz_condensation",
  "chaudière fioul": "chaudiere_fioul",
  "chaudière bois": "poele_bois",
  "poêle à granulés": "poele_granules",
  "poêle à bois": "poele_bois",
  "insert bois": "insert_bois",
  "réseau de chaleur": "reseau_chaleur",
};

const MAP_ENERGIE: Record<string, string> = {
  "electricité": "electricite",
  "électricité": "electricite",
  "gaz": "gaz_naturel",
  "fioul": "fioul",
  "bois": "bois_buches",
  "granulés": "granules",
  "gpl": "propane",
  "propane": "propane",
  "réseau de chaleur": "reseau_chaleur",
};

const MAP_ECS: Record<string, string> = {
  "ballon électrique": "ballon_electrique",
  "ballon thermodynamique": "ballon_thermodynamique",
  "chaudière": "ecs_gaz", // ECS liée à la chaudière : hypothèse gaz par défaut
  "solaire": "ecs_solaire",
  "instantané gaz": "ecs_gaz",
  "instantané électrique": "instantane",
  "instantané": "instantane",
};

const MAP_VENTILATION: Record<string, string> = {
  "aucune": "naturelle",
  "ventilation naturelle": "naturelle",
  "vmc simple flux autoréglable": "vmc_sf",
  "vmc simple flux hygroréglable a": "vmc_hygro_a",
  "vmc simple flux hygroréglable b": "vmc_hygro_b",
  "vmc double flux": "vmc_df",
};

function normaliserId(map: Record<string, string>, valeur: string | undefined, defaut: string): string {
  if (!valeur) return defaut;
  return map[valeur.trim().toLowerCase()] ?? defaut;
}

export function construireBatiment3CL(

  audit: AuditData

): Batiment3CL {

  const surfaceHabitable =

    audit.donnees_batiment?.surface_habitable ?? 0;

  const hauteurSousPlafond =

    audit.donnees_batiment?.hsp ?? 2.50;

  const volumeChauffe =

    surfaceHabitable * hauteurSousPlafond;

  // -------------------------
  // MURS
  // -------------------------

  const murs: ParoiMur[] =

    (audit.murs ?? []).map(mur => {

      const resultatU = calculUParoi({

        materiau:
          idMateriauMur(mur.composition),

        epaisseurMateriauCm:
          mur.epaisseur_cm ?? 20,

        isolant:
          idIsolant(mur.isolant_type),

        epaisseurIsolantCm:
          mur.epaisseur_isolant_cm ?? 0,

      });

      return {

        surface:

          surfaceMur(

            mur.longueur_m,

            mur.hauteur_m

          ),

        orientation:
          mur.orientation,

        u:
          resultatU.coefficientU,

        inertie:
          "moyenne",

      };

    });

  // -------------------------
  // MENUISERIES
  // -------------------------

  const menuiseries: ParoiMenuiserie[] =

    (audit.menuiseries ?? []).map(menuiserie => {

      const vitrage =

        VITRAGES.find(

          v => v.id === idVitrage(menuiserie.vitrage)

        ) ??

        VITRAGES[0];

      return {

        surface:

          surfaceMenuiserie(

            menuiserie.largeur_m,

            menuiserie.hauteur_m,

            menuiserie.nombre

          ),

        orientation:
          menuiserie.orientation,

        u:
          vitrage.uw,

        ug:
          vitrage.ug,

        uw:
          vitrage.uw,

        sw:
          vitrage.sw,

        tlw:
          vitrage.tlw,

      };

    });

  // -------------------------
  // PLANCHERS
  // -------------------------

  const planchers: ParoiPlancher[] =

    (audit.planchers ?? []).map(plancher => {

      const type =

        PLANCHERS.find(

          p => p.id === idPlancher(plancher.type, plancher.isolation)

        ) ??

        PLANCHERS[0];

      return {

        surface:
          plancher.surface_m2 ?? 0,

        u:
          type.u,

        inertie:
          type.inertie,

      };

    });

  // -------------------------
  // TOITURES
  // -------------------------

  const toitures: ParoiToiture[] =

    (audit.plafonds ?? []).map(plafond => {

      const type =

        TOITURES.find(

          t => t.id === idToiture(plafond.type, plafond.isolation)

        ) ??

        TOITURES[0];

      return {

        surface:
          plafond.surface_m2 ?? 0,

        u:
          type.u,

        inertie:
          type.inertie,

      };

    });

  return {

    surfaceHabitable,

    volumeChauffe,

    hauteurSousPlafond,

    anneeConstruction:

      audit.donnees_batiment?.annee_construction ?? 2000,

    typeBatiment:

      audit.donnees_batiment?.type_batiment ?? "",

    zoneClimatique:
      zoneClimatiqueDepuisCodePostal(audit.identification?.code_postal),

    murs,

    menuiseries,

    planchers,

    toitures,

    chauffage:
      audit.chauffage ? {
        ...audit.chauffage,
        systeme_principal: normaliserId(MAP_CHAUFFAGE, audit.chauffage.systeme_principal, "radiateur_electrique"),
        energie: normaliserId(MAP_ENERGIE, audit.chauffage.energie, "electricite"),
      } : audit.chauffage,

    ecs:
      audit.ecs ? {
        ...audit.ecs,
        systeme: normaliserId(MAP_ECS, audit.ecs.systeme, "ballon_electrique"),
      } : audit.ecs,

    ventilation:
      audit.ventilation ? {
        ...audit.ventilation,
        type: normaliserId(MAP_VENTILATION, audit.ventilation.type, "naturelle"),
      } : audit.ventilation,

  };

}