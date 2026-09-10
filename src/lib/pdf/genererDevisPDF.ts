import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Devis, DevisLigne, DevisAide, Prospect, Entreprise } from "../../types";

// Intl.NumberFormat('fr-FR') utilise l'espace fine insécable (U+202F) comme séparateur de
// milliers, un caractère absent de la police standard utilisée par jsPDF (WinAnsiEncoding) :
// résultat, des montants illisibles dans le PDF. On formate donc les nombres à la main avec
// une espace normale, garantie compatible.
const euro = (n: number | null | undefined): string => {
  const valeur = n || 0;
  const [entier, decimales] = valeur.toFixed(2).split(".");
  const entierEspace = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${entierEspace},${decimales} EUR`;
};

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", signe: "Signé", refuse: "Refusé", expire: "Expiré",
};

export function genererDevisPDF(
  devis: Devis,
  lignes: DevisLigne[],
  aides: DevisAide[],
  prospect: Prospect | null,
  entreprise: Entreprise | null
): jsPDF {

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marge = 15;
  let y = 18;

  // ---------------------------------------------------------------
  // Logo entreprise (facultatif), en haut à gauche
  // ---------------------------------------------------------------
  let decalageLogo = 0;
  if (entreprise?.logo_url && entreprise.logo_url.startsWith("data:image")) {
    try {
      const format = entreprise.logo_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(entreprise.logo_url, format, marge, y - 6, 26, 26, undefined, "FAST");
      decalageLogo = 32;
    } catch {
      // logo illisible : on continue sans bloquer la génération du PDF
    }
  }

  // ---------------------------------------------------------------
  // En-tête entreprise
  // ---------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(entreprise?.raison_sociale || "Mon entreprise", marge + decalageLogo, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 6;
  const infosEntreprise = [
    entreprise?.adresse,
    [entreprise?.code_postal, entreprise?.ville].filter(Boolean).join(" "),
    entreprise?.siret ? `SIRET : ${entreprise.siret}` : null,
    entreprise?.numero_rge ? `RGE n° ${entreprise.numero_rge}` : null,
    entreprise?.telephone,
    entreprise?.email,
  ].filter(Boolean) as string[];
  for (const ligne of infosEntreprise) {
    doc.text(ligne, marge + decalageLogo, y);
    y += 4.5;
  }
  if (decalageLogo > 0) y = Math.max(y, 18 + 26);

  // ---------------------------------------------------------------
  // Titre + statut, aligné à droite
  // ---------------------------------------------------------------
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEVIS", pageWidth - marge, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`N° ${devis.numero}`, pageWidth - marge, 27, { align: "right" });
  doc.text(`Date : ${new Date(devis.date_creation).toLocaleDateString("fr-FR")}`, pageWidth - marge, 32, { align: "right" });
  if (devis.date_validite) {
    doc.text(`Validité : ${new Date(devis.date_validite).toLocaleDateString("fr-FR")}`, pageWidth - marge, 37, { align: "right" });
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Statut : ${STATUT_LABEL[devis.statut] || devis.statut}`, pageWidth - marge, 42, { align: "right" });

  y = Math.max(y, 50) + 4;

  // ---------------------------------------------------------------
  // Bloc client
  // ---------------------------------------------------------------
  doc.setDrawColor(220);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(marge, y, pageWidth - 2 * marge, 26, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("CLIENT", marge + 4, y + 6);

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

  y += 32;

  // ---------------------------------------------------------------
  // Lignes du devis — inclut les caractéristiques techniques complètes
  // (obligatoire en mono-geste pour l'instruction des dossiers d'aides)
  // ---------------------------------------------------------------
  const body = lignes.map(l => {
    const carac = Object.entries(l.caracteristiques || {});
    let designation = l.designation;
    if (l.description) designation += `\n${l.description}`;
    if (carac.length > 0) {
      designation += `\nCaractéristiques : ${carac.map(([k, v]) => `${k} : ${v}`).join(" · ")}`;
    }
    return [
      designation,
      String(l.quantite),
      euro(l.prix_unitaire_ht),
      `${l.tva_taux}%`,
      euro(l.montant_ht),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Désignation", "Qté", "PU HT", "TVA", "Montant HT"]],
    body,
    margin: { left: marge, right: marge },
    styles: { fontSize: 8.5, cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [40, 80, 60], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 26, halign: "right" },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  // @ts-ignore — jspdf-autotable étend le type jsPDF au runtime
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---------------------------------------------------------------
  // Aides mobilisables
  // ---------------------------------------------------------------
  if (aides.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20);
    doc.text("Aides mobilisables", marge, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Aide", "Montant estimé"]],
      body: aides.map(a => [a.libelle, `- ${euro(a.montant)}`]),
      margin: { left: marge, right: marge },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [230, 244, 234], textColor: [30, 90, 50], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 4;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    const noteAides = doc.splitTextToSize(
      "Montants d'aides indicatifs, sous réserve d'éligibilité et de validation par les organismes " +
      "concernés (Anah, délégataires CEE). Le montant définitif de MaPrimeRénov' et des CEE est " +
      "confirmé après instruction du dossier, avant le démarrage des travaux.",
      pageWidth - 2 * marge
    );
    doc.text(noteAides, marge, y);
    y += noteAides.length * 3.2 + 4;
  }

  // ---------------------------------------------------------------
  // Totaux
  // ---------------------------------------------------------------
  if (y > 250) { doc.addPage(); y = 20; }

  const totalsX = pageWidth - marge - 70;
  doc.setDrawColor(220);
  doc.line(totalsX, y, pageWidth - marge, y);
  y += 6;

  const ligneTotal = (label: string, valeur: string, bold = false, color: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(...color);
    doc.text(label, totalsX, y);
    doc.text(valeur, pageWidth - marge, y, { align: "right" });
    y += bold ? 7 : 5.5;
  };

  ligneTotal("Total HT", euro(devis.montant_ht));
  ligneTotal("TVA", euro(devis.montant_tva));
  ligneTotal("Total TTC", euro(devis.montant_ttc), true);
  if (devis.montant_aides > 0) {
    ligneTotal("Aides mobilisées", `- ${euro(devis.montant_aides)}`, false, [30, 130, 76]);
  }
  doc.setDrawColor(40, 80, 60);
  doc.setLineWidth(0.6);
  doc.line(totalsX, y, pageWidth - marge, y);
  y += 6;
  ligneTotal("RESTE À CHARGE", euro(devis.reste_a_charge), true, [40, 80, 60]);
  doc.setLineWidth(0.2);

  // ---------------------------------------------------------------
  // Conditions de paiement (spécifiques à ce devis) + conditions générales
  // ---------------------------------------------------------------
  y += 8;
  if (devis.conditions_paiement) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("Conditions de paiement", marge, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    const conditionsPaiement = doc.splitTextToSize(devis.conditions_paiement, pageWidth - 2 * marge);
    doc.text(conditionsPaiement, marge, y);
    y += conditionsPaiement.length * 3.2 + 6;
  }
  if (entreprise?.conditions_generales_devis) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("Conditions générales", marge, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    const conditions = doc.splitTextToSize(entreprise.conditions_generales_devis, pageWidth - 2 * marge);
    doc.text(conditions, marge, y);
    y += conditions.length * 3.2 + 6;
  }

  // ---------------------------------------------------------------
  // Bloc signature (signature manuscrite capturée sur tablette)
  // ---------------------------------------------------------------
  if (devis.signature_statut === "signe" && devis.signature_image_data) {
    if (y > 210) { doc.addPage(); y = 20; }

    doc.setDrawColor(200);
    doc.setFillColor(247, 250, 248);
    const blocHauteur = 62;
    doc.roundedRect(marge, y, pageWidth - 2 * marge, blocHauteur, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 90, 50);
    doc.text('"Bon pour accord"', marge + 6, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60);
    doc.text(`Signé par : ${devis.signature_nom_signataire || "—"}`, marge + 6, y + 16);
    if (devis.signature_date) {
      const d = new Date(devis.signature_date);
      doc.text(
        `Le ${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        marge + 6, y + 21
      );
    }
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("Signature manuscrite capturée en direct sur tablette lors du rendez-vous", marge + 6, y + 27);

    try {
      doc.addImage(devis.signature_image_data, "PNG", pageWidth - marge - 60, y + 6, 55, blocHauteur - 14);
    } catch {
      // image de signature illisible : on n'échoue pas la génération du PDF pour autant
    }

    y += blocHauteur + 6;
  }

  // ---------------------------------------------------------------
  // Pied de page (numéro de page)
  // ---------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  return doc;
}

export function telechargerDevisPDF(
  devis: Devis,
  lignes: DevisLigne[],
  aides: DevisAide[],
  prospect: Prospect | null,
  entreprise: Entreprise | null
) {
  const doc = genererDevisPDF(devis, lignes, aides, prospect, entreprise);
  doc.save(`${devis.numero}.pdf`);
}
