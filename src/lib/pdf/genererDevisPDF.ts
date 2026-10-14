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

export function genererDevisPDF(
  devis: Devis,
  lignes: DevisLigne[],
  aides: DevisAide[],
  prospect: Prospect | null,
  entreprise: Entreprise | null,
  logoDataUrl?: string | null
): jsPDF {

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marge = 15;
  let y = 18;

  // ---------------------------------------------------------------
  // Logo entreprise (facultatif), en haut à gauche
  // ---------------------------------------------------------------
  let decalageLogo = 0;
  const logo = logoDataUrl || entreprise?.logo_url || '';
  if (logo && logo.startsWith("data:image")) {
    try {
      const format = logo.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(logo, format, marge, y - 6, 26, 26, undefined, "FAST");
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
  const nomAffichage = devis.emetteur_nom_affichage || entreprise?.raison_sociale || "Mon entreprise";
  doc.text(nomAffichage, marge + decalageLogo, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 6;
  const infosEntreprise = [
    devis.emetteur_raison_sociale || entreprise?.raison_sociale,
    devis.emetteur_forme_juridique || entreprise?.forme_juridique,
    devis.emetteur_adresse || entreprise?.adresse,
    [devis.emetteur_code_postal || entreprise?.code_postal, devis.emetteur_ville || entreprise?.ville].filter(Boolean).join(" "),
    (devis.emetteur_siret || entreprise?.siret) ? `SIRET : ${devis.emetteur_siret || entreprise?.siret}` : null,
    (devis.emetteur_numero_tva || entreprise?.numero_tva) ? `TVA : ${devis.emetteur_numero_tva || entreprise?.numero_tva}` : null,
    entreprise?.numero_rge ? `RGE n° ${entreprise.numero_rge}` : null,
    devis.emetteur_telephone || entreprise?.telephone,
    devis.emetteur_email || entreprise?.email,
  ].filter(Boolean) as string[];
  for (const ligne of infosEntreprise) {
    doc.text(ligne, marge + decalageLogo, y);
    y += 4.5;
  }
  if (decalageLogo > 0) y = Math.max(y, 18 + 26);

  // ---------------------------------------------------------------
  // En-tête du devis : bandeau sobre, sans statut interne (brouillon/signé)
  // ---------------------------------------------------------------
  doc.setFillColor(31, 69, 54);
  doc.roundedRect(pageWidth - marge - 66, 12, 66, 31, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEVIS", pageWidth - marge - 4, 21, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`N° ${devis.numero}`, pageWidth - marge - 4, 28, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Émis le ${new Date(devis.date_creation).toLocaleDateString("fr-FR")}`, pageWidth - marge - 4, 34, { align: "right" });
  if (devis.date_validite) {
    doc.text(`Valable jusqu’au ${new Date(devis.date_validite).toLocaleDateString("fr-FR")}`, pageWidth - marge - 4, 39, { align: "right" });
  }
  doc.setTextColor(20, 20, 20);
  y = Math.max(y, 50) + 4;

  // ---------------------------------------------------------------
  // Bloc client
  // ---------------------------------------------------------------
  doc.setDrawColor(222, 229, 224);
  doc.setFillColor(246, 249, 247);
  doc.roundedRect(marge, y, pageWidth - 2 * marge, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(31, 69, 54);
  doc.text("DEVIS ÉTABLI POUR", marge + 4, y + 6);

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
    headStyles: { fillColor: [31, 69, 54], textColor: 255, fontStyle: "bold" },
    theme: "grid",
    tableLineColor: [225, 231, 226],
    tableLineWidth: 0.15,
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 26, halign: "right" },
    },
    alternateRowStyles: { fillColor: [247, 249, 247] },
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

  const remiseHT = Number(devis.remise_montant_ht || 0);
  if (remiseHT > 0) {
    ligneTotal("Total HT avant remise", euro(devis.montant_ht_avant_remise || (devis.montant_ht + remiseHT)));
    const libelleRemise = devis.remise_type === "pourcentage"
      ? `Remise commerciale (${Number(devis.remise_valeur || 0).toLocaleString("fr-FR")} %)`
      : "Remise commerciale";
    ligneTotal(libelleRemise, `- ${euro(remiseHT)}`, false, [40, 130, 80]);
  }
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
  // Conditions de paiement : restent dans le corps du devis
  // ---------------------------------------------------------------
  y += 5;
  if (devis.conditions_paiement) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(246, 249, 247);
    doc.setDrawColor(222, 229, 224);
    doc.roundedRect(marge, y - 3, pageWidth - 2 * marge, 9, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(31, 69, 54);
    doc.text("CONDITIONS DE PAIEMENT", marge + 3, y + 2.5);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70);
    const conditionsPaiement = doc.splitTextToSize(devis.conditions_paiement, pageWidth - 2 * marge - 2);
    if (y + conditionsPaiement.length * 3.6 > 276) { doc.addPage(); y = 20; }
    doc.text(conditionsPaiement, marge + 1, y);
    y += conditionsPaiement.length * 3.6 + 5;
  }

  // ---------------------------------------------------------------
  // Bon pour accord : avant les annexes contractuelles, dans le devis
  // ---------------------------------------------------------------
  const blocHauteur = 48;
  if (y + blocHauteur > 277) { doc.addPage(); y = 20; }
  doc.setDrawColor(184, 199, 188);
  doc.setFillColor(249, 251, 249);
  doc.roundedRect(marge, y, pageWidth - 2 * marge, blocHauteur, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(31, 69, 54);
  doc.text("BON POUR ACCORD", marge + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(65);
  doc.text("Le client reconnaît avoir pris connaissance du devis et de ses annexes.", marge + 5, y + 13);
  if (devis.signature_statut === "signe" && devis.signature_image_data) {
    doc.setFont("helvetica", "bold");
    doc.text(`Signataire : ${devis.signature_nom_signataire || "—"}`, marge + 5, y + 20);
    if (devis.signature_date) {
      const d = new Date(devis.signature_date);
      doc.setFont("helvetica", "normal");
      doc.text(`Signé le ${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, marge + 5, y + 25);
    }
    try {
      doc.addImage(devis.signature_image_data, "PNG", pageWidth - marge - 58, y + 5, 52, 30);
    } catch { /* Signature illisible : le PDF reste générable. */ }
  } else {
    doc.text("Nom et prénom : ........................................................................", marge + 5, y + 22);
    doc.text("Date : ....................................   Signature :", marge + 5, y + 31);
    doc.setDrawColor(190);
    doc.line(marge + 60, y + 38, pageWidth - marge - 5, y + 38);
  }
  y += blocHauteur + 7;

  // ---------------------------------------------------------------
  // CGV en annexe, après le devis. Le bordereau est extrait et imprimé
  // sur une page dédiée dans un encadré détachable.
  // ---------------------------------------------------------------
  const conditionsBrutes = devis.emetteur_cgv || entreprise?.conditions_generales_devis || "";
  if (conditionsBrutes.trim()) {
    const marqueurBordereau = /BORDEREAU DE RÉTRACTATION/i;
    const matchBordereau = conditionsBrutes.match(marqueurBordereau);
    let texteCGV = conditionsBrutes;
    let texteBordereau = "";
    if (matchBordereau && matchBordereau.index !== undefined) {
      texteCGV = conditionsBrutes.slice(0, matchBordereau.index).trim();
      texteBordereau = conditionsBrutes.slice(matchBordereau.index).trim();
    }

    if (texteCGV) {
      const paragraphes = texteCGV.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      // Garde chaque titre d'article avec son paragraphe pour éviter les titres orphelins.
      const blocs: string[] = [];
      for (let i = 0; i < paragraphes.length; i++) {
        const para = paragraphes[i];
        if (/^Article \d+/i.test(para) && i + 1 < paragraphes.length) {
          blocs.push(`${para}\n${paragraphes[++i]}`);
        } else {
          blocs.push(para);
        }
      }
      // Répartit les blocs entre deux colonnes selon leur longueur estimée.
      const colGauche: string[] = [];
      const colDroite: string[] = [];
      let poidsGauche = 0, poidsDroite = 0;
      for (const para of blocs) {
        const poids = Math.max(1, Math.ceil(para.length / 78));
        if (poidsGauche <= poidsDroite) { colGauche.push(para); poidsGauche += poids; }
        else { colDroite.push(para); poidsDroite += poids; }
      }
      const largeurCol = (pageWidth - 2 * marge - 10) / 2;
      const xColonnes = [marge, marge + largeurCol + 10];
      const dessinerColonne = (paras: string[], x: number, yDepart: number) => {
        let cy = yDepart;
        for (const para of paras) {
          const morceaux = /^Article \d+/i.test(para) ? para.split(/\n/, 2) : [para];
          const estTitrePrincipal = /^CONDITIONS GÉNÉRALES DE VENTE$/i.test(para);
          for (let index = 0; index < morceaux.length; index++) {
            const morceau = morceaux[index].trim();
            if (!morceau) continue;
            const titre = estTitrePrincipal || (/^Article \d+/i.test(para) && index === 0);
            doc.setFont("helvetica", titre ? "bold" : "normal");
            doc.setFontSize(titre ? 7.3 : 6.7);
            doc.setTextColor(titre ? 31 : 65, titre ? 69 : 65, titre ? 54 : 65);
            const lignesTexte = doc.splitTextToSize(morceau, largeurCol);
            const hauteur = lignesTexte.length * (titre ? 3.1 : 2.85) + (titre ? 2.2 : 2.8);
            if (cy + hauteur > 278) {
              doc.addPage();
              cy = 20;
            }
            doc.text(lignesTexte, x, cy);
            cy += hauteur;
          }
        }
        return cy;
      };
      doc.addPage();
      doc.setFillColor(31, 69, 54);
      doc.rect(0, 0, pageWidth, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255);
      doc.text("CONDITIONS GÉNÉRALES DE VENTE", marge, 9);
      doc.setDrawColor(220, 228, 222);
      doc.setLineWidth(0.25);
      doc.line(pageWidth / 2, 20, pageWidth / 2, 278);
      // Les colonnes peuvent continuer sur les pages suivantes si le texte est long.
      dessinerColonne(colGauche, xColonnes[0], 22);
      dessinerColonne(colDroite, xColonnes[1], 22);
    }

    if (texteBordereau) {
      doc.addPage();
      const x = marge, largeur = pageWidth - 2 * marge;
      const yHaut = 27, hauteur = 218;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("DÉCOUPER SUIVANT LES POINTILLÉS", marge, 18);
      doc.setDrawColor(110, 125, 115);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([2, 1.5], 0);
      doc.roundedRect(x, yHaut, largeur, hauteur, 2, 2, "S");
      doc.setLineDashPattern([], 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 69, 54);
      doc.text("BORDEREAU DE RÉTRACTATION", pageWidth / 2, yHaut + 13, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(85);
      doc.text("À renvoyer uniquement si vous souhaitez vous rétracter.", pageWidth / 2, yHaut + 20, { align: "center" });
      const lignesFormulaire = texteBordereau
        .replace(/^BORDEREAU DE RÉTRACTATION\s*/i, "")
        .replace(/\(À renvoyer uniquement[^)]*\)/i, "")
        .split(/\n+/).map(l => l.trim()).filter(Boolean);
      let by = yHaut + 32;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(35);
      for (const ligne of lignesFormulaire) {
        const wraps = doc.splitTextToSize(ligne, largeur - 16);
        const isLongBlank = /[.…]{5,}/.test(ligne);
        const h = Math.max(isLongBlank ? 12 : 8, wraps.length * 4.5 + 3);
        if (by + h > yHaut + hauteur - 10) break;
        doc.text(wraps, x + 8, by);
        if (isLongBlank) {
          doc.setDrawColor(185);
          doc.line(x + 8, by + 4, x + largeur - 8, by + 4);
        }
        by += h;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text("Conservez une copie de ce document.", pageWidth / 2, yHaut + hauteur - 7, { align: "center" });
    }
  }

  // ---------------------------------------------------------------
  // Pied de page (numéro de page)
  // ---------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(125);
    doc.setDrawColor(230, 234, 231);
    doc.line(marge, doc.internal.pageSize.getHeight() - 13, pageWidth - marge, doc.internal.pageSize.getHeight() - 13);
    doc.text(`${devis.numero}  •  Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 7, { align: "center" });
  }

  return doc;
}

export async function telechargerDevisPDF(
  devis: Devis,
  lignes: DevisLigne[],
  aides: DevisAide[],
  prospect: Prospect | null,
  entreprise: Entreprise | null
) {
  let logoDataUrl: string | null = null;
  const logoUrl = devis.emetteur_logo_url || '';
  if (logoUrl && !logoUrl.startsWith('data:image')) {
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Le devis reste générable même si le logo partenaire n'est pas accessible.
    }
  }
  const doc = genererDevisPDF(devis, lignes, aides, prospect, entreprise, logoDataUrl);
  doc.save(`${devis.numero}.pdf`);
}
