import type { AuditData } from "../../types";
import type { Batiment3CL } from "../3cl/batiment3CL";

export interface AlerteCoherence {
  niveau: "erreur" | "avertissement";
  section: string;
  message: string;
}

/**
 * Contrôle de cohérence de l'audit avant clôture de la visite technique.
 *
 * Ces vérifications restent volontairement non bloquantes (le commercial peut avoir de
 * bonnes raisons de laisser un champ vide sur une visite ciblée) : elles sont affichées
 * comme une checklist à examiner avant de terminer, pas comme des erreurs empêchant la
 * validation. Seules les incohérences les plus manifestes sont classées "erreur" (surlignées
 * plus fortement) ; le reste est un simple avertissement.
 */
export function verifierCoherenceAudit(
  audit: AuditData,
  batiment: Batiment3CL,
  activeSections: number[]
): AlerteCoherence[] {
  const alertes: AlerteCoherence[] = [];
  const actif = (sectionId: number) => activeSections.includes(sectionId);

  // ---- Section 2 : données bâtiment ----
  if (actif(2)) {
    const bat = audit.donnees_batiment;
    if (!bat?.surface_habitable || bat.surface_habitable <= 0) {
      alertes.push({ niveau: "erreur", section: "Bâtiment", message: "La surface habitable n'est pas renseignée : le calcul DPE ne peut pas être fiable sans elle." });
    } else if (bat.surface_habitable < 9 || bat.surface_habitable > 1000) {
      alertes.push({ niveau: "avertissement", section: "Bâtiment", message: `Surface habitable inhabituelle (${bat.surface_habitable} m²) — vérifier la saisie.` });
    }
    if (bat?.hsp != null && (bat.hsp < 2 || bat.hsp > 4)) {
      alertes.push({ niveau: "avertissement", section: "Bâtiment", message: `Hauteur sous plafond inhabituelle (${bat.hsp} m) — vérifier la saisie.` });
    }
    if (bat?.annee_construction != null && (bat.annee_construction < 1700 || bat.annee_construction > new Date().getFullYear())) {
      alertes.push({ niveau: "avertissement", section: "Bâtiment", message: `Année de construction incohérente (${bat.annee_construction}).` });
    }
    if (!bat?.type_batiment) {
      alertes.push({ niveau: "avertissement", section: "Bâtiment", message: "Le type de bâtiment (maison/appartement) n'est pas renseigné." });
    }
  }

  // ---- Section 3 : murs ----
  if (actif(3)) {
    const murs = audit.murs || [];
    if (murs.length === 0) {
      alertes.push({ niveau: "erreur", section: "Murs", message: "Aucun mur renseigné : le calcul des déperditions sera incomplet." });
    } else {
      const surfaceMurs = murs.reduce((s, m) => s + ((m.longueur_m || 0) * (m.hauteur_m || 0)), 0);
      const surfaceHabitable = audit.donnees_batiment?.surface_habitable || 0;
      // Ordre de grandeur usuel : la surface de murs extérieurs d'une maison individuelle
      // représente très approximativement 1 à 2,5 fois la surface habitable au sol.
      if (surfaceHabitable > 0 && surfaceMurs > 0 && (surfaceMurs < surfaceHabitable * 0.3 || surfaceMurs > surfaceHabitable * 4)) {
        alertes.push({ niveau: "avertissement", section: "Murs", message: `Surface totale de murs (${Math.round(surfaceMurs)} m²) très éloignée de ce qu'on attendrait pour ${surfaceHabitable} m² habitables — vérifier les dimensions saisies.` });
      }
      const mursIsolationInconnue = murs.filter(m => !m.isole).length;
      if (mursIsolationInconnue > 0) {
        alertes.push({ niveau: "avertissement", section: "Murs", message: `${mursIsolationInconnue} mur(s) sans information d'isolation (oui/non) renseignée.` });
      }
      const mursIsolesSansEpaisseur = murs.filter(m => m.isole === "oui" && !m.epaisseur_isolant_cm);
      if (mursIsolesSansEpaisseur.length > 0) {
        alertes.push({ niveau: "avertissement", section: "Murs", message: `${mursIsolesSansEpaisseur.length} mur(s) déclaré(s) isolé(s) sans épaisseur d'isolant renseignée — le gain sera sous-estimé.` });
      }
    }
  }

  // ---- Section 4 : menuiseries ----
  if (actif(4)) {
    const menuiseries = audit.menuiseries || [];
    if (menuiseries.length === 0) {
      alertes.push({ niveau: "avertissement", section: "Menuiseries", message: "Aucune menuiserie renseignée — vérifier que ce n'est pas un oubli." });
    }
  }

  // ---- Section 7 : ventilation ----
  if (actif(7) && !audit.ventilation?.type) {
    alertes.push({ niveau: "avertissement", section: "Ventilation", message: "Le système de ventilation n'est pas renseigné." });
  }

  // ---- Section 8 : chauffage ----
  if (actif(8)) {
    if (!audit.chauffage?.systeme_principal) {
      alertes.push({ niveau: "erreur", section: "Chauffage", message: "Le système de chauffage principal n'est pas renseigné : le DPE ne peut pas être calculé correctement." });
    }
    if (!audit.chauffage?.energie) {
      alertes.push({ niveau: "avertissement", section: "Chauffage", message: "L'énergie de chauffage n'est pas renseignée." });
    }
  }

  // ---- Section 9 : ECS ----
  if (actif(9) && !audit.ecs?.systeme) {
    alertes.push({ niveau: "avertissement", section: "ECS", message: "Le système de production d'eau chaude sanitaire n'est pas renseigné." });
  }

  // ---- Section 10 : photovoltaïque ----
  if (actif(10)) {
    const pv = audit.photovoltaique;
    if (pv?.interet_client === "oui" && !pv.orientation_toiture) {
      alertes.push({ niveau: "avertissement", section: "Photovoltaïque", message: "Le client est intéressé mais l'orientation de la toiture n'est pas renseignée." });
    }
  }

  return alertes;
}
