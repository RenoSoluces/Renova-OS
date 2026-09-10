import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Prospect, Visite, AuditData, Entreprise } from "../../types";
import type { Batiment3CL } from "../3cl/batiment3CL";
import type { ResultatDPE } from "../3cl/calculDPE";
import type { ResultatDeperditions } from "../3cl/calcul/deperditions/calculDeperditions";
import type { ResultatSimulationPV } from "../photovoltaique/calculProduction";
import type { PropositionTravaux, PropositionBouquet } from "../3cl/analyse/proposerTravaux";
import type { EstimationFinancement } from "../financement/estimerFinancement";
import { dpeColor } from "../3cl/moteur3CL";

// Voir genererDevisPDF.ts : Intl.NumberFormat('fr-FR') utilise une espace fine insécable
// absente de la police standard jsPDF. On formate donc les nombres à la main.
const nombre = (n: number | null | undefined, decimales = 0): string => {
  const valeur = n || 0;
  const [entier, dec] = valeur.toFixed(decimales).split(".");
  const entierEspace = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${entierEspace},${dec}` : entierEspace;
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

const OUI_NON: Record<string, string> = { oui: "Oui", non: "Non" };

export function genererRapportVisitePDF(
  visite: Visite,
  auditData: AuditData,
  batiment: Batiment3CL,
  dpe: ResultatDPE | null,
  deperditions: ResultatDeperditions | null,
  travaux: PropositionTravaux[] | null,
  prospect: Prospect | null,
  entreprise: Entreprise | null,
  bouquets: PropositionBouquet[] | null = null,
  photovoltaique: ResultatSimulationPV | null = null,
  financementParGeste: Record<string, EstimationFinancement> = {}
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marge = 15;
  let y = 18;

  const sautDePageSiNecessaire = (hauteurNecessaire: number) => {
    if (y + hauteurNecessaire > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  const titreSection = (texte: string) => {
    sautDePageSiNecessaire(16);
    doc.setFillColor(40, 80, 60);
    doc.rect(marge, y, pageWidth - 2 * marge, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255);
    doc.text(texte.toUpperCase(), marge + 3, y + 5.6);
    y += 13;
  };

  const ligneCle = (label: string, valeur: string | null | undefined) => {
    if (!valeur) return;
    sautDePageSiNecessaire(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(label, marge, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(String(valeur), marge + 62, y);
    y += 5.5;
  };

  // ---------------------------------------------------------------
  // Logo + en-tête entreprise
  // ---------------------------------------------------------------
  let decalageLogo = 0;
  if (entreprise?.logo_url && entreprise.logo_url.startsWith("data:image")) {
    try {
      const format = entreprise.logo_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(entreprise.logo_url, format, marge, y - 6, 24, 24, undefined, "FAST");
      decalageLogo = 30;
    } catch {
      // logo illisible : on continue sans bloquer la génération du PDF
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(entreprise?.raison_sociale || "Mon entreprise", marge + decalageLogo, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  y += 5.5;
  const infosEntreprise = [
    [entreprise?.adresse, [entreprise?.code_postal, entreprise?.ville].filter(Boolean).join(" ")].filter(Boolean).join(" — "),
    entreprise?.numero_rge ? `RGE n° ${entreprise.numero_rge}` : null,
    [entreprise?.telephone, entreprise?.email].filter(Boolean).join(" · "),
  ].filter(Boolean) as string[];
  for (const ligne of infosEntreprise) {
    doc.text(ligne, marge + decalageLogo, y);
    y += 4.2;
  }
  y = Math.max(y, 18 + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(0);
  doc.text("RAPPORT DE VISITE TECHNIQUE", pageWidth - marge, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(`Audit énergétique — méthode 3CL-DPE`, pageWidth - marge, 26, { align: "right" });
  doc.text(`Date de visite : ${new Date(visite.date_visite).toLocaleDateString("fr-FR")}`, pageWidth - marge, 32, { align: "right" });
  doc.text(`Réf. dossier : ${visite.id.slice(0, 8).toUpperCase()}`, pageWidth - marge, 37, { align: "right" });

  y += 8;

  // ---------------------------------------------------------------
  // Bloc client / logement
  // ---------------------------------------------------------------
  doc.setDrawColor(220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(marge, y, pageWidth - 2 * marge, 26, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("LOGEMENT VISITÉ", marge + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  const nomClient = prospect ? `${prospect.civilite || ""} ${prospect.prenom} ${prospect.nom}`.trim() : "—";
  doc.text(nomClient, marge + 4, y + 12);
  const adresseClient = prospect
    ? [prospect.adresse_rue || prospect.adresse, `${prospect.code_postal || ""} ${prospect.ville || ""}`.trim()].filter(Boolean).join(", ")
    : "";
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(adresseClient, marge + 4, y + 17);
  if (prospect?.telephone || prospect?.email) {
    doc.text([prospect?.telephone, prospect?.email].filter(Boolean).join(" · "), marge + 4, y + 22);
  }
  y += 34;

  // ---------------------------------------------------------------
  // 1. Identification & données bâtiment
  // ---------------------------------------------------------------
  titreSection("1. Identification & bâtiment");
  const ident = auditData.identification;
  const bat = auditData.donnees_batiment;
  ligneCle("Occupation", ident?.occupation);
  ligneCle("Type de bâtiment", bat?.type_batiment);
  ligneCle("Mitoyenneté", bat?.mitoyennete);
  ligneCle("Surface habitable", bat?.surface_habitable ? `${nombre(bat.surface_habitable)} m²` : null);
  ligneCle("Nombre de niveaux", bat?.nombre_niveaux ? String(bat.nombre_niveaux) : null);
  ligneCle("Hauteur sous plafond", bat?.hsp ? `${bat.hsp} m` : null);
  ligneCle("Année de construction", bat?.annee_construction ? String(bat.annee_construction) : null);
  ligneCle("Orientation principale", bat?.orientation_principale);
  ligneCle("État général", bat?.etat_general);
  ligneCle("Zone climatique (3CL)", batiment.zoneClimatique);
  if (ident?.notes) {
    y += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    const notes = doc.splitTextToSize(`Notes : ${ident.notes}`, pageWidth - 2 * marge);
    sautDePageSiNecessaire(notes.length * 4 + 2);
    doc.text(notes, marge, y);
    y += notes.length * 4 + 2;
  }
  y += 4;

  // ---------------------------------------------------------------
  // 2. Enveloppe du bâtiment (murs, menuiseries, planchers, plafonds)
  // ---------------------------------------------------------------
  titreSection("2. Enveloppe du bâtiment");

  if (auditData.murs && auditData.murs.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    sautDePageSiNecessaire(8);
    doc.text("Murs", marge, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Orientation", "Composition", "Isolé", "Isolant", "Ép. isolant", "Surface"]],
      body: auditData.murs.map(m => [
        m.orientation || "—",
        m.composition || "—",
        OUI_NON[m.isole] || m.isole || "—",
        m.isolant_type || "—",
        m.epaisseur_isolant_cm ? `${m.epaisseur_isolant_cm} cm` : "—",
        m.longueur_m && m.hauteur_m ? `${nombre(m.longueur_m * m.hauteur_m, 1)} m²` : "—",
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [230, 236, 232], textColor: [30, 60, 45], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (auditData.menuiseries && auditData.menuiseries.length > 0) {
    sautDePageSiNecessaire(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.text("Menuiseries", marge, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Type", "Orientation", "Vitrage", "Matériau", "Dimensions", "Nb"]],
      body: auditData.menuiseries.map(m => [
        m.type_menuiserie || "—",
        m.orientation || "—",
        m.vitrage || "—",
        m.materiau || "—",
        m.largeur_m && m.hauteur_m ? `${m.largeur_m} × ${m.hauteur_m} m` : "—",
        String(m.nombre || 1),
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [230, 236, 232], textColor: [30, 60, 45], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (auditData.planchers && auditData.planchers.length > 0) {
    sautDePageSiNecessaire(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.text("Planchers bas", marge, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Type", "Position", "Surface", "Isolé", "Isolant"]],
      body: auditData.planchers.map(p => [
        p.type || "—",
        p.position || "—",
        p.surface_m2 ? `${nombre(p.surface_m2)} m²` : "—",
        OUI_NON[p.isolation] || p.isolation || "—",
        p.isolant_type || "—",
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [230, 236, 232], textColor: [30, 60, 45], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (auditData.plafonds && auditData.plafonds.length > 0) {
    sautDePageSiNecessaire(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.text("Plafonds / toiture", marge, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Type", "Position", "Surface", "Isolé", "Isolant"]],
      body: auditData.plafonds.map(p => [
        p.type || "—",
        p.position || "—",
        p.surface_m2 ? `${nombre(p.surface_m2)} m²` : "—",
        OUI_NON[p.isolation] || p.isolation || "—",
        p.isolant_type || "—",
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [230, 236, 232], textColor: [30, 60, 45], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ---------------------------------------------------------------
  // 3. Systèmes (ventilation, chauffage, ECS)
  // ---------------------------------------------------------------
  titreSection("3. Systèmes techniques");
  ligneCle("Ventilation", auditData.ventilation?.type);
  ligneCle("VMC présente", auditData.ventilation?.presence_vmc ? OUI_NON[auditData.ventilation.presence_vmc] || auditData.ventilation.presence_vmc : null);
  y += 2;
  ligneCle("Chauffage principal", auditData.chauffage?.systeme_principal);
  ligneCle("Énergie de chauffage", auditData.chauffage?.energie);
  ligneCle("Puissance installée", auditData.chauffage?.puissance_kw ? `${auditData.chauffage.puissance_kw} kW` : null);
  ligneCle("Chauffage secondaire", auditData.chauffage?.systeme_secondaire);
  y += 2;
  ligneCle("Eau chaude sanitaire", auditData.ecs?.systeme);
  ligneCle("Énergie ECS", auditData.ecs?.energie);
  ligneCle("Capacité de stockage", auditData.ecs?.capacite_l ? `${auditData.ecs.capacite_l} L` : null);
  y += 6;

  // ---------------------------------------------------------------
  // 4. Étiquette DPE / note du logement
  // ---------------------------------------------------------------
  if (dpe) {
    sautDePageSiNecessaire(70);
    titreSection("4. Note du logement — Diagnostic 3CL");

    // Grand médaillon étiquette
    const [r, g, b] = hexToRgb(dpe.couleur);
    doc.setFillColor(r, g, b);
    doc.roundedRect(marge, y, 34, 34, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(dpe.etiquette >= "E" ? 255 : 30);
    doc.text(dpe.etiquette, marge + 17, y + 22, { align: "center" });

    const xInfo = marge + 42;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("Consommation en énergie primaire", xInfo, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text(`${nombre(dpe.consommationEP)} kWhEP/m².an`, xInfo, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("Émissions de gaz à effet de serre", xInfo, y + 21);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`${nombre(dpe.emissionsM2, 1)} kgCO₂/m².an`, xInfo, y + 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Étiquette énergie : ${dpe.etiquetteEnergie}  ·  Étiquette climat : ${dpe.etiquetteGES}  (méthode du double seuil : la moins favorable des deux est retenue)`, xInfo, y + 33);

    y += 40;

    // Échelle DPE (A à G)
    const lettres = ["A", "B", "C", "D", "E", "F", "G"];
    const largeurCase = (pageWidth - 2 * marge) / 7;
    lettres.forEach((l, i) => {
      const x = marge + i * largeurCase;
      const [cr, cg, cb] = hexToRgb(
        l === "A" ? "#009640" : l === "B" ? "#52AE32" : l === "C" ? "#CADB2A" : l === "D" ? "#F6EB14" : l === "E" ? "#F5A623" : l === "F" ? "#E67E22" : "#D0021B"
      );
      doc.setFillColor(cr, cg, cb);
      const actif = l === dpe.etiquette;
      doc.rect(x + 1, y, largeurCase - 2, actif ? 10 : 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(actif ? 11 : 9);
      doc.setTextColor(l >= "E" ? 255 : 30);
      doc.text(l, x + largeurCase / 2, y + (actif ? 7 : 5), { align: "center" });
    });
    y += 16;

    // Détail par poste (chauffage / ECS)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(40);
    doc.text("Détail par poste de consommation", marge, y);
    y += 2;
    const bodyPostes: string[][] = [
      ["Chauffage", `${nombre(dpe.chauffage.consommationEP)} kWhEP/an`, `${nombre(dpe.chauffage.emissionsCO2)} kgCO₂/an`],
      ["Eau chaude sanitaire", `${nombre(dpe.ecs.consommationEP)} kWhEP/an`, `${nombre(dpe.ecs.emissionsCO2)} kgCO₂/an`],
    ];
    if (deperditions) {
      bodyPostes.push(
        ["Déperditions murs", `${nombre(deperditions.murs)} W/K`, "—"],
        ["Déperditions menuiseries", `${nombre(deperditions.menuiseries)} W/K`, "—"],
        ["Déperditions planchers", `${nombre(deperditions.planchers)} W/K`, "—"],
        ["Déperditions toitures", `${nombre(deperditions.toitures)} W/K`, "—"],
        ["Ponts thermiques", `${nombre(deperditions.pontsThermiques)} W/K`, "—"],
        ["Renouvellement d'air", `${nombre(deperditions.renouvellementAir)} W/K`, "—"],
      );
    }
    autoTable(doc, {
      startY: y,
      head: [["Poste", "Énergie primaire", "Émissions CO₂"]],
      body: bodyPostes,
      margin: { left: marge, right: marge },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    const noteMethode = doc.splitTextToSize(
      "Calcul réalisé selon la méthode 3CL-DPE (arrêté du 31 mars 2021). Ce document constitue une évaluation " +
      "technique réalisée dans le cadre d'une visite commerciale et ne remplace pas un Diagnostic de Performance " +
      "Énergétique réglementaire établi par un diagnostiqueur certifié.",
      pageWidth - 2 * marge
    );
    doc.text(noteMethode, marge, y);
    y += noteMethode.length * 3.2 + 6;
  }

  // ---------------------------------------------------------------
  // 5. Bouquets de travaux combinés
  // ---------------------------------------------------------------
  if (bouquets && bouquets.length > 0) {
    sautDePageSiNecessaire(20);
    titreSection("5. Bouquets de travaux recommandés");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text("Combinaisons de plusieurs gestes simulées ensemble, pour une rénovation cohérente.", marge, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Bouquet", "Gestes inclus", "Étiquette avant → après", "Gain énergie", "Reste à charge estimé"]],
      body: bouquets.map(b => {
        const items = b.gestes.map(g => financementParGeste[g]).filter(Boolean);
        const resteACharge = items.length > 0 ? items.reduce((s, i) => s + i.resteACharge, 0) : null;
        return [
          `${b.titre}\n${b.description}`,
          b.gestesLabels.join(", "),
          `${b.etiquetteAvant}  →  ${b.etiquetteApres}${b.sautsEtiquette > 0 ? `\n(${b.sautsEtiquette} classe${b.sautsEtiquette > 1 ? "s" : ""} gagnée${b.sautsEtiquette > 1 ? "s" : ""})` : ""}`,
          `-${nombre(b.gainPourcentage)}% (-${nombre(b.gainCEP)} kWhEP/an)`,
          resteACharge != null ? `${nombre(resteACharge)} €` : "—",
        ];
      }),
      margin: { left: marge, right: marge },
      styles: { fontSize: 7.5, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 40 },
        2: { cellWidth: 28, halign: "center" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Reste à charge estimé à partir du catalogue de l'entreprise (ou d'un prix indicatif de marché) et des aides mobilisables connues à ce jour.", marge, y);
    y += 8;
  }

  // ---------------------------------------------------------------
  // 6. Recommandations de travaux (gestes isolés)
  // ---------------------------------------------------------------
  if (travaux && travaux.length > 0) {
    sautDePageSiNecessaire(20);
    titreSection("6. Recommandations de travaux — geste par geste");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text("Classées par impact estimé sur la consommation, simulées individuellement sur le logement audité.", marge, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Travaux", "Étiquette avant → après", "Gain énergie", "Reste à charge estimé"]],
      body: travaux.map(t => [
        `${t.titre}\n${t.description}`,
        `${t.etiquetteAvant}  →  ${t.etiquetteApres}`,
        `-${nombre(t.gainPourcentage)}% (-${nombre(t.gainCEP)} kWhEP/an)`,
        financementParGeste[t.id] ? `${nombre(financementParGeste[t.id].resteACharge)} €` : "—",
      ]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 34, halign: "center" },
        2: { cellWidth: 42, halign: "right" },
        3: { cellWidth: 36, halign: "right" },
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---------------------------------------------------------------
  // 7. Photovoltaïque
  // ---------------------------------------------------------------
  if (photovoltaique) {
    sautDePageSiNecessaire(60);
    titreSection("7. Photovoltaïque — estimation");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    const noteMethodePV = doc.splitTextToSize(
      "Estimation commerciale à partir des relevés de visite (orientation, inclinaison, masques solaires). " +
      "Ne remplace pas une étude technique détaillée (bureau d'études ou simulation PVGIS).",
      pageWidth - 2 * marge
    );
    doc.text(noteMethodePV, marge, y);
    y += noteMethodePV.length * 3.2 + 5;

    autoTable(doc, {
      startY: y,
      head: [["Indicateur", "Valeur"]],
      body: [
        ["Puissance retenue", `${nombre(photovoltaique.puissanceInstallee, 1)} kWc`],
        ["Surface de toiture nécessaire", `${nombre(photovoltaique.surfaceNecessaire, 1)} m²`],
        ["Production annuelle estimée", `${nombre(photovoltaique.productionAnnuelle)} kWh/an`],
        ["Taux d'autoconsommation estimé", `${Math.round(photovoltaique.tauxAutoconsommation * 100)}%`],
        ["Économie sur facture (autoconsommation)", `${nombre(photovoltaique.economieAutoconsommation)} €/an`],
        ["Revenu de revente du surplus", `${nombre(photovoltaique.revenuRevente)} €/an`],
        ["Gain financier annuel total", `${nombre(photovoltaique.gainAnnuelTotal)} €/an`],
        ["Investissement estimé (avant aides)", `${nombre(photovoltaique.investissementEstime)} € TTC`],
        ["Prime à l'autoconsommation", `${nombre(photovoltaique.primeAutoconsommation)} €`],
        ["Investissement net", `${nombre(photovoltaique.investissementNet)} €`],
        ["Retour sur investissement estimé", photovoltaique.dureeAmortissementAnnees ? `${nombre(photovoltaique.dureeAmortissementAnnees, 1)} ans` : "—"],
      ],
      margin: { left: marge, right: marge },
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 1: { halign: "right" } },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;

    if (photovoltaique.alerteSurfaceInsuffisante || photovoltaique.alerteMasquesImportants) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 60, 20);
      if (photovoltaique.alerteSurfaceInsuffisante) {
        doc.text("⚠ Surface de toiture disponible probablement insuffisante pour la puissance visée.", marge, y);
        y += 5;
      }
      if (photovoltaique.alerteMasquesImportants) {
        doc.text("⚠ Masques solaires importants relevés — la production réelle pourrait être inférieure à cette estimation.", marge, y);
        y += 5;
      }
      y += 3;
    }
  }

  // ---------------------------------------------------------------
  // Pied de page
  // ---------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(
      `Rapport de visite technique — ${entreprise?.raison_sociale || ""} — Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}

export function telechargerRapportVisitePDF(
  visite: Visite,
  auditData: AuditData,
  batiment: Batiment3CL,
  dpe: ResultatDPE | null,
  deperditions: ResultatDeperditions | null,
  travaux: PropositionTravaux[] | null,
  prospect: Prospect | null,
  entreprise: Entreprise | null,
  bouquets: PropositionBouquet[] | null = null,
  photovoltaique: ResultatSimulationPV | null = null,
  financementParGeste: Record<string, EstimationFinancement> = {}
) {
  const doc = genererRapportVisitePDF(visite, auditData, batiment, dpe, deperditions, travaux, prospect, entreprise, bouquets, photovoltaique, financementParGeste);
  const nomFichier = prospect
    ? `rapport-visite-${prospect.nom}-${prospect.prenom}-${visite.id.slice(0, 8)}.pdf`.replace(/\s+/g, "_")
    : `rapport-visite-${visite.id.slice(0, 8)}.pdf`;
  doc.save(nomFichier);
}
