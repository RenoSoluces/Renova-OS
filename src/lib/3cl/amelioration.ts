import { Batiment3CL } from "./batiment3CL";
import { calculDPE, ResultatDPE } from "./calculDPE";

export interface ResultatSimulation {

  batiment: Batiment3CL;

  avant: ResultatDPE;

  apres: ResultatDPE;

}

function copierBatiment(
  batiment: Batiment3CL
): Batiment3CL {

  return structuredClone(batiment);

}

/* --------------------------------------------------
   COMBLES
-------------------------------------------------- */

export function simulerIsolationCombles(
  batiment: Batiment3CL,
  nouveauU: number = 0.18
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  copie.toitures.forEach(t => {
    t.u = Math.min(t.u, nouveauU);
  });

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   MURS
-------------------------------------------------- */

export function simulerIsolationMurs(
  batiment: Batiment3CL,
  nouveauU: number = 0.20
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  copie.murs.forEach(m => {
    m.u = Math.min(m.u, nouveauU);
  });

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   PLANCHER
-------------------------------------------------- */

export function simulerIsolationPlancher(
  batiment: Batiment3CL,
  nouveauU: number = 0.25
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  copie.planchers.forEach(p => {
    p.u = Math.min(p.u, nouveauU);
  });

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   MENUISERIES
-------------------------------------------------- */

export function simulerMenuiseries(
  batiment: Batiment3CL
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  copie.menuiseries.forEach(f => {

    f.u = 1.20;
    f.uw = 1.20;
    f.ug = 1.00;
    f.sw = 0.55;
    f.tlw = 0.70;

  });

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   PAC AIR / EAU
-------------------------------------------------- */

export function simulerPAC(
  batiment: Batiment3CL
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  if (copie.chauffage) {

    copie.chauffage.systeme_principal = "pac_air_eau";

  }

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   PAC AIR / AIR
-------------------------------------------------- */

export function simulerPACAirAir(
  batiment: Batiment3CL
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  if (copie.chauffage) {

    copie.chauffage.systeme_principal = "pac_air_air";

  }

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   BALLON THERMODYNAMIQUE
-------------------------------------------------- */

export function simulerBallonThermodynamique(
  batiment: Batiment3CL
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  if (copie.ecs) {

    copie.ecs.systeme = "ballon_thermodynamique";

  }

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   VMC HYGRO B
-------------------------------------------------- */

export function simulerVMC(
  batiment: Batiment3CL
): ResultatSimulation {

  const copie = copierBatiment(batiment);

  if (copie.ventilation) {

    copie.ventilation.type = "vmc_hygro_b";

  }

  return {

    batiment: copie,

    avant: calculDPE(batiment),

    apres: calculDPE(copie),

  };

}

/* --------------------------------------------------
   BOUQUETS DE TRAVAUX (combinaison de plusieurs gestes)
   --------------------------------------------------
   Applique successivement, sur une même copie du bâtiment, les modifications
   correspondant à chaque geste demandé, puis calcule le DPE avant/après sur
   l'ensemble combiné. Permet d'évaluer un "bouquet" (ex : combles + murs +
   menuiseries + PAC) plutôt qu'un geste isolé.
-------------------------------------------------- */

export type GesteTravaux =
  | "combles"
  | "murs"
  | "plancher"
  | "menuiseries"
  | "pac"
  | "pac_air_air"
  | "ballon_thermodynamique"
  | "vmc";

function appliquerGeste(copie: Batiment3CL, geste: GesteTravaux): void {
  switch (geste) {
    case "combles":
      copie.toitures.forEach(t => { t.u = Math.min(t.u, 0.18); });
      break;
    case "murs":
      copie.murs.forEach(m => { m.u = Math.min(m.u, 0.20); });
      break;
    case "plancher":
      copie.planchers.forEach(p => { p.u = Math.min(p.u, 0.25); });
      break;
    case "menuiseries":
      copie.menuiseries.forEach(f => {
        f.u = 1.20;
        f.uw = 1.20;
        f.ug = 1.00;
        f.sw = 0.55;
        f.tlw = 0.70;
      });
      break;
    case "pac":
      if (copie.chauffage) copie.chauffage.systeme_principal = "pac_air_eau";
      break;
    case "pac_air_air":
      if (copie.chauffage) copie.chauffage.systeme_principal = "pac_air_air";
      break;
    case "ballon_thermodynamique":
      if (copie.ecs) copie.ecs.systeme = "ballon_thermodynamique";
      break;
    case "vmc":
      if (copie.ventilation) copie.ventilation.type = "vmc_hygro_b";
      break;
  }
}

export function appliquerTravaux(
  batiment: Batiment3CL,
  gestes: GesteTravaux[]
): ResultatSimulation {

  const copie = copierBatiment(batiment);
  gestes.forEach(g => appliquerGeste(copie, g));

  return {
    batiment: copie,
    avant: calculDPE(batiment),
    apres: calculDPE(copie),
  };
}