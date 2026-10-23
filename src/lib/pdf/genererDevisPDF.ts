import jsPDF from "jspdf";
import type { Devis, DevisLigne, DevisAide, Prospect, Entreprise } from "../../types";

type RGB = readonly [number, number, number];
const C = {
  ink: [24, 34, 29] as RGB, vert: [31, 69, 54] as RGB,
  moyen: [62, 120, 92] as RGB, menthe: [233, 241, 236] as RGB,
  fond: [246, 249, 247] as RGB, gris: [112, 122, 116] as RGB,
  clair: [168, 176, 171] as RGB, trait: [222, 228, 224] as RGB,
  blanc: [255, 255, 255] as RGB,
};
const txt = (d: jsPDF, c: RGB) => d.setTextColor(...c);
const fil = (d: jsPDF, c: RGB) => d.setFillColor(...c);
const drw = (d: jsPDF, c: RGB) => d.setDrawColor(...c);
const euro = (n: number | null | undefined): string => {
  const v = Number(n) || 0; const [a,b] = Math.abs(v).toFixed(2).split(".");
  return `${v < 0 ? "-" : ""}${a.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${b} €`;
};
const pct = (n: number | string) => `${String(n).replace(".", ",")} %`;
const safe = (v: unknown): string => String(v ?? "").replace(/λ/g,"lambda").replace(/η/g,"eta ")
  .replace(/≥/g,">=").replace(/≤/g,"<=").replace(/≈/g,"~").replace(/·/g,".")
  .replace(/[‑‐]/g,"-").replace(/[  ]/g," ").replace(/→/g,"->").replace(/✂/g,"");
const technicalKey = (k: string) => /^[a-z0-9_]+$/.test(k);

const LABELS: Record<string,string> = {
  ite:"Isolation par l’extérieur (ITE)", murs:"Isolation des murs", combles:"Isolation des rampants",
  rampants:"Isolation des rampants", combles_perdus:"Isolation des combles perdus",
  plancher:"Isolation du plancher bas", menuiseries:"Menuiseries extérieures — fenêtres",
  menuiseries_portes:"Menuiseries extérieures — portes", pac_air_eau:"Pompe à chaleur air/eau",
  pac_air_air:"Pompe à chaleur air/air", pac_geothermie:"Pompe à chaleur géothermique",
  ballon_thermodynamique:"Ballon thermodynamique", vmc:"Ventilation (VMC)",
  photovoltaique:"Photovoltaïque", solaire_thermique:"Solaire thermique",
  autre:"Autres prestations", professionnel_cee:"Professionnels — CEE",
  professionnel_hors_cee:"Professionnels — hors CEE", destratificateur:"Destratificateur",
  hp_flottante:"HP flottante", isolation_toiture_pro:"Isolation de toiture",
  isolation_combles_pro:"Isolation combles / rampants — professionnels",
  pro_photovoltaique:"Photovoltaïque — professionnel", ssc:"Système solaire combiné (SSC)",
};
function parseDescription(description: string) {
  const raw = safe(description).trim();
  if (!raw) return { specs: [] as {label:string; value:string}[], paragraph: "" };
  const [head, ...tail] = raw.split(/\n\s*\n/);
  const lines = head.split("\n").map(x=>x.trim()).filter(Boolean);
  if (lines.length < 2 || !lines.every(x=>/^[^:]{2,60}\s*:\s*.+/.test(x)))
    return { specs: [] as {label:string; value:string}[], paragraph: raw.replace(/\s*\n\s*/g," ") };
  const specs = lines.map(line=>{ const i=line.indexOf(":"); return {label:line.slice(0,i).trim(),value:line.slice(i+1).trim()}; });
  return { specs, paragraph: tail.join(" ").replace(/\s*\n\s*/g," ").trim() };
}

export function genererDevisPDF(
  devis: Devis, lignes: DevisLigne[], aides: DevisAide[], prospect: Prospect | null,
  entreprise: Entreprise | null, logoDataUrl?: string | null
): jsPDF {
  const doc = new jsPDF({unit:"mm",format:"a4"});
  const PW=doc.internal.pageSize.getWidth(), PH=doc.internal.pageSize.getHeight(), M=16, W=PW-2*M, BOTTOM=PH-19;
  let y=0;
  const partner=devis.emetteur_type==="partenaire";
  const name=devis.emetteur_nom_affichage||entreprise?.raison_sociale||"Mon entreprise";
  const legalName=devis.emetteur_raison_sociale||entreprise?.raison_sociale||name;
  const form=devis.emetteur_forme_juridique||entreprise?.forme_juridique||"";
  const addr=devis.emetteur_adresse||entreprise?.adresse||"";
  const cpCity=[devis.emetteur_code_postal||entreprise?.code_postal,devis.emetteur_ville||entreprise?.ville].filter(Boolean).join(" ");
  const siret=devis.emetteur_siret||entreprise?.siret||"";
  const vat=devis.emetteur_numero_tva||entreprise?.numero_tva||"";
  const phone=devis.emetteur_telephone||entreprise?.telephone||"";
  const email=devis.emetteur_email||entreprise?.email||"";
  const rge=partner?"":(entreprise?.numero_rge||"");
  const clientName=prospect?[`${prospect.civilite||""} ${prospect.prenom||""} ${prospect.nom||""}`].join("").replace(/\s+/g," ").trim():"—";
  const clientAddr=prospect?.adresse_rue||prospect?.adresse||"";
  const clientCity=prospect?[`${prospect.code_postal||""} ${prospect.ville||""}`].join("").trim():"";
  const date=(v?:string|null)=>v?new Date(v).toLocaleDateString("fr-FR"):"—";
  const label=(s:string,x:number,yy:number,color:RGB=C.moyen)=>{doc.setFont("helvetica","bold");doc.setFontSize(6.8);txt(doc,color);doc.text(s.toUpperCase(),x,yy,{charSpace:.6});};
  const newPage=()=>{doc.addPage();y=22;doc.setFont("helvetica","normal");doc.setFontSize(7.5);txt(doc,C.clair);doc.text(safe(`DEVIS N° ${devis.numero} · ${clientName}`),PW-M,11,{align:"right"});doc.text(safe(name.toUpperCase()),M,11);};
  const ensure=(h:number)=>{if(y+h>BOTTOM){newPage();return true;}return false;};

  // En-tête éditorial
  let nameX=M; const logo=logoDataUrl||devis.emetteur_logo_url||entreprise?.logo_url||"";
  if(logo.startsWith("data:image")){try{doc.addImage(logo,logo.includes("image/png")?"PNG":"JPEG",M,13,22,22,undefined,"FAST");nameX=M+27;}catch{}}
  doc.setFont("helvetica","bold");doc.setFontSize(17);txt(doc,C.vert);doc.text(safe(name),nameX,23);
  doc.setFont("helvetica","normal");doc.setFontSize(8.5);txt(doc,C.gris);
  const subtitle=[form,legalName!==name?legalName:""].filter(Boolean).join(" · ");if(subtitle)doc.text(safe(subtitle),nameX,28.5);
  if(rge){doc.setFont("helvetica","bold");doc.setFontSize(7.5);txt(doc,C.moyen);doc.text(safe(`ENTREPRISE RGE · N° ${rge}`),nameX,34);}
  doc.setFont("helvetica","bold");doc.setFontSize(30);txt(doc,C.ink);doc.text("DEVIS",PW-M,24,{align:"right",charSpace:2});
  doc.setFont("helvetica","normal");doc.setFontSize(10);txt(doc,C.gris);doc.text(safe(`N° ${devis.numero}`),PW-M,31,{align:"right"});
  drw(doc,C.vert);doc.setLineWidth(.5);doc.line(M,40,PW-M,40);

  // Synthèse
  y=46;const bandH=17,cellW=W/4;fil(doc,C.fond);doc.roundedRect(M,y,W,bandH,2,2,"F");
  const cells:[string,string,boolean][]=[
    ["Date d’émission",date(devis.date_creation),false],["Valable jusqu’au",date(devis.date_validite),false],
    ["Total TTC",euro(devis.montant_ttc),false],["Reste à charge",euro(devis.reste_a_charge),true]];
  cells.forEach(([title,value,accent],i)=>{const x=M+i*cellW+5;if(accent){fil(doc,C.vert);doc.roundedRect(M+i*cellW,y,cellW,bandH,2,2,"F");}
    label(title,x,y+6,accent?[190,215,200]:C.gris);doc.setFont("helvetica","bold");doc.setFontSize(11.5);txt(doc,accent?C.blanc:C.ink);doc.text(safe(value),x,y+13);
    if(i>0&&i<3){drw(doc,C.trait);doc.setLineWidth(.2);doc.line(M+i*cellW,y+4,M+i*cellW,y+bandH-4);}});
  y+=bandH+9;

  // Émetteur / client
  const colW=(W-12)/2,xClient=M+colW+12;
  label("Émetteur",M,y);label("Établi pour",xClient,y);drw(doc,C.trait);doc.line(M,y+2,M+colW,y+2);doc.line(xClient,y+2,PW-M,y+2);
  let ye=y+8,yc=y+8;doc.setFont("helvetica","bold");doc.setFontSize(10.5);txt(doc,C.ink);doc.text(safe(legalName),M,ye);ye+=5.2;doc.text(safe(clientName),xClient,yc);yc+=5.2;
  const issuer=[addr,cpCity,siret?`SIRET : ${siret}`:"",vat?`TVA intracommunautaire : ${vat}`:"",[phone,email].filter(Boolean).join(" · ")].filter(Boolean);
  const customer=[clientAddr,clientCity,prospect?.telephone||"",prospect?.email||""].filter(Boolean);
  doc.setFont("helvetica","normal");doc.setFontSize(8.5);txt(doc,C.gris);
  for(const line of issuer)for(const part of doc.splitTextToSize(safe(line),colW) as string[]){doc.text(part,M,ye);ye+=4.2;}
  for(const line of customer)for(const part of doc.splitTextToSize(safe(line),colW) as string[]){doc.text(part,xClient,yc);yc+=4.2;}
  y=Math.max(ye,yc)+5;
  const objects=[...new Set(lignes.map(l=>LABELS[l.categorie||"autre"]||"").filter(Boolean))];
  if(objects.length){label("Objet",M,y);doc.setFont("helvetica","normal");doc.setFontSize(9);txt(doc,C.ink);doc.text(doc.splitTextToSize(safe(`Fourniture et pose — ${objects.join(", ")}`),W-18),M+18,y);y+=Math.max(5,Math.ceil(doc.getTextWidth(objects.join(", "))/(W-18))*4.2)+3;}
  y+=4;

  // Tableau de postes
  const Q=13,PU=25,TVA=14,TOT=27,DESC=W-(Q+PU+TVA+TOT)-4;
  const xQ=M+DESC+4+Q,xPU=xQ+PU,xTVA=xPU+TVA,xTot=PW-M;
  const columnHeader=()=>{label("Désignation",M,y,C.gris);doc.setFont("helvetica","bold");doc.setFontSize(6.8);txt(doc,C.gris);doc.text("QTÉ",xQ,y,{align:"right"});doc.text("PU HT",xPU,y,{align:"right"});doc.text("TVA",xTVA,y,{align:"right"});doc.text("TOTAL HT",xTot,y,{align:"right"});y+=5;};
  const groups:{cat:string;lines:DevisLigne[]}[]=[];
  for(const line of lignes){const cat=line.categorie||"autre";const last=groups[groups.length-1];if(last&&last.cat===cat)last.lines.push(line);else groups.push({cat,lines:[line]});}
  const measure=(line:DevisLigne)=>{
    const parsed=parseDescription(line.description||"");
    const specs=parsed.specs.filter(s=>!/^(désignation|surface)$/i.test(s.label));
    const seen=new Set(specs.map(s=>s.label.toLowerCase().replace(/[.\s]/g,"")));
    for(const [k,v] of Object.entries(line.caracteristiques||{})){if(technicalKey(k)||v===""||v==null)continue;const key=k.toLowerCase().replace(/[.\s]/g,"");if(seen.has(key)||(key==="référence"&&seen.has("réf")))continue;specs.push({label:k,value:safe(v)});seen.add(key);}
    doc.setFont("helvetica","bold");doc.setFontSize(9.2);const title=doc.splitTextToSize(safe(line.designation),DESC) as string[];
    const lw=Math.min(40,Math.max(0,...specs.map(s=>doc.getTextWidth(s.label)))+2);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);
    const specRows=specs.map(s=>({label:s.label,rows:doc.splitTextToSize(safe(s.value),DESC-lw) as string[]}));
    doc.setFont("helvetica","italic");doc.setFontSize(7.2);const para=parsed.paragraph?doc.splitTextToSize(parsed.paragraph,DESC-4) as string[]:[];
    return {title,lw,specRows,para,height:1.5+title.length*4.3+(specRows.length?1.5+specRows.reduce((n,s)=>n+s.rows.length*3.4,0):0)+(para.length?2+para.length*3.2:0)+5};
  };
  const section=(num:number,name:string,total:number,continuation:boolean)=>{fil(doc,C.vert);doc.roundedRect(M,y,6.4,6.4,1.2,1.2,"F");doc.setFont("helvetica","bold");doc.setFontSize(9);txt(doc,C.blanc);doc.text(String(num),M+3.2,y+4.5,{align:"center"});doc.setFontSize(10.5);txt(doc,C.ink);doc.text(safe(name+(continuation?" (suite)":"")),M+9.5,y+4.6);doc.setFont("helvetica","normal");doc.setFontSize(8.2);txt(doc,C.gris);doc.text(`Sous-total HT  ${euro(total)}`,xTot,y+4.6,{align:"right"});y+=9;drw(doc,C.vert);doc.setLineWidth(.35);doc.line(M,y,PW-M,y);y+=3.5;};
  columnHeader();y+=2;
  groups.forEach((g,idx)=>{const title=LABELS[g.cat]||g.cat;const subtotal=g.lines.reduce((a,l)=>a+(Number(l.montant_ht)||0),0);
    if(y+14+measure(g.lines[0]).height>BOTTOM)newPage();section(idx+1,title,subtotal,false);
    for(const line of g.lines){let m=measure(line);if(y+m.height>BOTTOM){newPage();columnHeader();y+=2;section(idx+1,title,subtotal,true);m=measure(line);}
      let cy=y+4.7;doc.setFont("helvetica","bold");doc.setFontSize(9.2);txt(doc,C.ink);for(const t of m.title){doc.text(t,M,cy);cy+=4.3;}
      const yNum=y+4.7;doc.setFont("helvetica","normal");doc.setFontSize(8.6);txt(doc,C.ink);doc.text(String(line.quantite).replace(".",","),xQ,yNum,{align:"right"});doc.text(euro(line.prix_unitaire_ht),xPU,yNum,{align:"right"});txt(doc,C.gris);doc.text(pct(line.tva_taux),xTVA,yNum,{align:"right"});doc.setFont("helvetica","bold");txt(doc,C.ink);doc.text(euro(line.montant_ht),xTot,yNum,{align:"right"});
      if(m.specRows.length){cy=y+1.5+m.title.length*4.3+1.8;doc.setFont("helvetica","normal");doc.setFontSize(7.5);for(const s of m.specRows){txt(doc,C.clair);doc.text(s.label,M,cy);txt(doc,[50,60,54]);s.rows.forEach((t,i)=>doc.text(t,M+m.lw,cy+i*3.4));cy+=s.rows.length*3.4;}}
      if(m.para.length){cy=y+1.5+m.title.length*4.3+(m.specRows.length?m.specRows.reduce((n,s)=>n+s.rows.length*3.4,0)+3:2);doc.setFont("helvetica","italic");doc.setFontSize(7.2);txt(doc,C.gris);m.para.forEach((t,i)=>doc.text(t,M+4,cy+i*3.2));}
      y+=m.height;drw(doc,C.trait);doc.setLineWidth(.2);doc.line(M,y-1.5,PW-M,y-1.5);
    }y+=5;
  });

  // Totaux et aides
  const discount=Number(devis.remise_montant_ht||0),wTotal=84,xTotal=PW-M-wTotal,wLeft=W-wTotal-10;
  const sumLines=lignes.reduce((a,l)=>a+(Number(l.montant_ht)||0),0),ratio=sumLines>0?Number(devis.montant_ht||0)/sumLines:1;
  const taxMap=new Map<number,number>();for(const l of lignes){const rate=Number(l.tva_taux)||0;taxMap.set(rate,(taxMap.get(rate)||0)+(Number(l.montant_ht)||0)*ratio);}
  const taxRows=[...taxMap.entries()].sort((a,b)=>a[0]-b[0]).map(([rate,base])=>({rate,base,tax:Math.round(base*rate)/100}));
  const taxReliable=taxRows.length>0&&Math.abs(taxRows.reduce((a,t)=>a+t.tax,0)-Number(devis.montant_tva||0))<.1;
  const totals:{label:string;value:string;style:"n"|"g"|"b"}[]=[];
  if(discount>0){totals.push({label:"Total HT avant remise",value:euro(devis.montant_ht_avant_remise||(Number(devis.montant_ht)+discount)),style:"n"});totals.push({label:devis.remise_type==="pourcentage"?`Remise commerciale (${pct(Number(devis.remise_valeur||0))})`:"Remise commerciale",value:`- ${euro(discount)}`,style:"g"});}
  totals.push({label:"Total HT",value:euro(devis.montant_ht),style:"b"});
  if(taxReliable)taxRows.forEach(t=>totals.push({label:`TVA ${pct(t.rate)} (base ${euro(t.base)})`,value:euro(t.tax),style:"n"}));else totals.push({label:"TVA",value:euro(devis.montant_tva),style:"n"});
  totals.push({label:"Total TTC",value:euro(devis.montant_ttc),style:"b"});
  if(Number(devis.montant_aides)>0)totals.push({label:"Aides mobilisées",value:`- ${euro(devis.montant_aides)}`,style:"g"});
  const note="Montants indicatifs, sous réserve d’éligibilité et de validation par les organismes concernés. Les montants définitifs sont confirmés après instruction du dossier.";
  doc.setFont("helvetica","normal");doc.setFontSize(7.1);const noteLines=doc.splitTextToSize(safe(note),wLeft-8) as string[];
  const hLeft=aides.length?12+aides.length*6+3+noteLines.length*3.1+4:0,hRight=totals.length*6+21;
  ensure(Math.max(hLeft,hRight)+5);const blockY=y;
  if(aides.length){fil(doc,C.menthe);doc.roundedRect(M,blockY,wLeft,hLeft,2,2,"F");label("Aides mobilisables",M+4,blockY+6.5,C.vert);let ay=blockY+13;
    for(const a of aides){doc.setFont("helvetica","normal");doc.setFontSize(8);txt(doc,C.ink);const l=(doc.splitTextToSize(safe(a.libelle),wLeft-30) as string[])[0]||"";doc.text(l,M+4,ay);doc.setFont("helvetica","bold");txt(doc,C.vert);doc.text(`- ${euro(a.montant)}`,M+wLeft-4,ay,{align:"right"});ay+=6;}
    doc.setFont("helvetica","italic");doc.setFontSize(7.1);txt(doc,C.gris);doc.text(noteLines,M+4,ay+1);}
  let ty=blockY+4;for(const t of totals){if(t.style==="b"){drw(doc,C.trait);doc.line(xTotal,ty-4.2,PW-M,ty-4.2);}doc.setFont("helvetica",t.style==="b"?"bold":"normal");doc.setFontSize(t.style==="b"?9.8:8.3);txt(doc,t.style==="g"?C.moyen:t.style==="b"?C.ink:C.gris);doc.text(safe(t.label),xTotal,ty);txt(doc,t.style==="g"?C.moyen:C.ink);doc.text(t.value,PW-M,ty,{align:"right"});ty+=6;}
  ty+=1;fil(doc,C.vert);doc.roundedRect(xTotal-4,ty-1,wTotal+4,15,2,2,"F");label("Reste à charge",xTotal+1,ty+5.8,[190,215,200]);doc.setFont("helvetica","bold");doc.setFontSize(14);txt(doc,C.blanc);doc.text(euro(devis.reste_a_charge),PW-M-3,ty+10.8,{align:"right"});y=blockY+Math.max(hLeft,hRight)+8;

  // Conditions de règlement
  const payment=devis.conditions_paiement||entreprise?.devis_conditions_paiement_defaut||entreprise?.conditions_paiement_defaut||"";
  const bank=!partner?entreprise?.iban:"";const settlement=[bank?`IBAN : ${bank}`:"",!partner&&entreprise?.bic?`BIC : ${entreprise.bic}`:"",!partner&&entreprise?.banque?`Banque : ${entreprise.banque}`:"",entreprise?.taux_penalite_retard?`Pénalités de retard : ${entreprise.taux_penalite_retard}`:"",entreprise?.escompte_defaut?`Escompte : ${entreprise.escompte_defaut}`:""].filter(Boolean);
  if(payment||settlement.length){const two=Boolean(payment&&settlement.length),cw=two?(W-8)/2:W;doc.setFont("helvetica","normal");doc.setFontSize(8);const p=payment?doc.splitTextToSize(safe(payment),cw-8) as string[]:[],b=settlement.flatMap(v=>doc.splitTextToSize(safe(v),cw-8) as string[]);const h=11+Math.max(p.length,b.length)*3.8+3;ensure(h+4);
    const box=(x:number,w:number,title:string,rows:string[])=>{drw(doc,C.trait);fil(doc,C.blanc);doc.roundedRect(x,y,w,h,2,2,"S");label(title,x+4,y+6.2);doc.setFont("helvetica","normal");doc.setFontSize(8);txt(doc,[50,60,54]);rows.forEach((t,i)=>doc.text(t,x+4,y+11.5+i*3.8));};
    if(p.length)box(M,cw,"Conditions de paiement",p);if(b.length)box(two?M+cw+8:M,cw,"Règlement",b);y+=h+8;}

  // Bon pour accord
  ensure(68);label("Acceptation du devis",M,y,C.vert);y+=3;const signH=52,signW=(W-8)/2;
  drw(doc,C.vert);doc.setLineWidth(.4);fil(doc,C.blanc);doc.roundedRect(M,y,signW,signH,2,2,"S");drw(doc,C.trait);doc.setLineWidth(.25);doc.roundedRect(M+signW+8,y,signW,signH,2,2,"S");
  doc.setFont("helvetica","bold");doc.setFontSize(9.2);txt(doc,C.ink);doc.text("Le client — Bon pour accord",M+5,y+7);
  doc.setFont("helvetica","normal");doc.setFontSize(7.2);txt(doc,C.gris);doc.text(doc.splitTextToSize("Précédé de la mention manuscrite « Bon pour accord, lu et approuvé », daté et signé.",signW-10),M+5,y+11.5);
  if(devis.signature_statut==="signe"&&devis.signature_image_data){doc.setFont("helvetica","bold");doc.setFontSize(8);txt(doc,C.ink);doc.text(safe(`Signataire : ${devis.signature_nom_signataire||"—"}`),M+5,y+21);if(devis.signature_date){doc.setFont("helvetica","normal");txt(doc,C.gris);doc.text(`Signé le ${date(devis.signature_date)}`,M+5,y+26);}try{doc.addImage(devis.signature_image_data,"PNG",M+signW-50,y+20,44,26);}catch{}}
  else{doc.setFont("helvetica","normal");doc.setFontSize(8);txt(doc,C.gris);doc.text("Nom :",M+5,y+24);doc.text("Date :",M+5,y+33);doc.text("Signature :",M+signW/2+4,y+33);drw(doc,C.trait);doc.line(M+16,y+24.5,M+signW-5,y+24.5);doc.line(M+14,y+33.5,M+signW/2-2,y+33.5);}
  doc.setFont("helvetica","bold");doc.setFontSize(9.2);txt(doc,C.ink);doc.text("L’entreprise",M+signW+13,y+7);doc.setFont("helvetica","normal");doc.setFontSize(7.2);txt(doc,C.gris);doc.text("Cachet et signature",M+signW+13,y+11.5);y+=signH+6;
  doc.setFont("helvetica","italic");doc.setFontSize(7.1);txt(doc,C.gris);const withdrawal=doc.splitTextToSize("Pour les contrats conclus à distance ou hors établissement, le délai légal de rétractation applicable est indiqué dans les mentions légales et les conditions générales jointes.",W) as string[];doc.text(withdrawal,M,y);

  // Mentions légales et informations société
  doc.addPage();fil(doc,C.vert);doc.rect(0,0,PW,16,"F");doc.setFont("helvetica","bold");doc.setFontSize(11);txt(doc,C.blanc);doc.text("MENTIONS LÉGALES",M,10.2,{charSpace:1.2});y=27;
  const sectionText=(title:string,body:string)=>{doc.setFont("helvetica","normal");doc.setFontSize(8.2);const rows=doc.splitTextToSize(safe(body),W) as string[];const h=13+rows.length*3.7;if(y+h>PH-18){doc.addPage();fil(doc,C.vert);doc.rect(0,0,PW,16,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);txt(doc,C.blanc);doc.text("MENTIONS LÉGALES (SUITE)",M,10.2);y=27;}label(title,M,y);drw(doc,C.trait);doc.line(M,y+2,PW-M,y+2);doc.setFont("helvetica","normal");doc.setFontSize(8.2);txt(doc,[50,60,54]);doc.text(rows,M,y+7.5);y+=7.5+rows.length*3.7+5;};
  label("Identification de l’entreprise",M,y);drw(doc,C.trait);doc.line(M,y+2,PW-M,y+2);y+=8;
  const identity:[string,string][]=[["Dénomination",legalName],["Forme juridique",form],["Capital social",!partner?(entreprise?.capital_social||""):""],["Siège",[addr,cpCity].filter(Boolean).join(", ")],["SIRET",siret],["TVA intracom.",vat],["Contact",[phone,email].filter(Boolean).join(" · ")]].filter((x)=>Boolean(x[1]));
  for(const [k,v] of identity){doc.setFont("helvetica","normal");doc.setFontSize(8.2);txt(doc,C.gris);doc.text(k,M,y);txt(doc,C.ink);doc.text(safe(v),M+38,y);y+=4.8;}y+=3;
  const qualifications=!partner?(entreprise?.qualifications_rge||[]):[];
  if(rge||qualifications.length){label("Qualifications RGE",M,y);drw(doc,C.trait);doc.line(M,y+2,PW-M,y+2);y+=8;if(rge){doc.setFont("helvetica","normal");doc.setFontSize(8.2);txt(doc,C.gris);doc.text("N° RGE",M,y);txt(doc,C.ink);doc.text(safe(rge),M+38,y);y+=4.8;}for(const q of qualifications){doc.setFont("helvetica","normal");doc.setFontSize(8.2);txt(doc,C.gris);doc.text("Domaine",M,y);txt(doc,C.ink);doc.text(safe(`${q.domaine} — certificat ${q.certificat}${q.validite?` (valide jusqu’au ${q.validite})`:""}`),M+38,y);y+=4.8;}y+=3;}
  sectionText("Droit de rétractation","Pour les contrats conclus à distance ou hors établissement, le consommateur dispose en principe d’un délai de quatorze jours calendaires à compter de la conclusion du contrat pour exercer son droit de rétractation, sous réserve des exceptions et modalités prévues par le Code de la consommation. Les règles de paiement avant l’expiration du délai légal dépendent du mode de conclusion du contrat et des exceptions applicables.");
  sectionText("Garanties légales","Les équipements et travaux bénéficient des garanties légales applicables selon la nature du bien ou des travaux et les conditions prévues par la loi, notamment la garantie des vices cachés et, lorsqu’elle est applicable, la garantie légale de conformité, ainsi que les garanties de construction applicables.");
  if(lignes.some(l=>Number(l.tva_taux)<20))sectionText("TVA à taux réduit","Le taux réduit de TVA est appliqué sous réserve que le logement, les travaux et les justificatifs remplissent les conditions légales en vigueur. À défaut, le taux normal peut être applicable et un complément de TVA peut être dû.");
  if(aides.length||lignes.some(l=>Boolean((l.caracteristiques as any)?.fiche_cee)))sectionText("Aides et primes","Les aides et primes indiquées dans ce devis sont estimatives et non contractuelles. Leur attribution et leur montant dépendent de l’éligibilité du client, du logement, des équipements et de l’acceptation du dossier par les organismes concernés. Les conditions et le calendrier d’engagement doivent être vérifiés avant le démarrage des travaux.");
  sectionText("Médiation de la consommation","En cas de litige non résolu avec l’entreprise, le client consommateur peut recourir gratuitement au médiateur de la consommation désigné par l’entreprise, après une réclamation écrite préalable. Les coordonnées du médiateur doivent être renseignées dans les conditions générales ou les documents contractuels.");
  sectionText("Retard de paiement",`${entreprise?.taux_penalite_retard?`Pénalités de retard : ${entreprise.taux_penalite_retard}. `:""}Pour les clients professionnels, une indemnité forfaitaire pour frais de recouvrement de 40 € est due dans les conditions prévues par le Code de commerce.`);
  sectionText("Données personnelles",`Les données sont utilisées pour établir et exécuter le devis et gérer la relation client. Le client peut exercer les droits prévus par la réglementation relative aux données personnelles auprès de l’entreprise${email?` (${email})`:""}, et peut saisir la CNIL.`);

  // CGV de l'émetteur, en annexe paginée
  const cgvBrutes=safe(devis.emetteur_cgv||entreprise?.conditions_generales_devis||"").trim();
  const matchBordereau=cgvBrutes.match(/BORDEREAU DE RÉTRACTATION/i);
  const cgv=matchBordereau?.index!==undefined?cgvBrutes.slice(0,matchBordereau.index).trim():cgvBrutes;
  const bordereau=matchBordereau?.index!==undefined?cgvBrutes.slice(matchBordereau.index).trim():"";
  if(cgv){
    const paragraphs=cgv.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean).filter(p=>!/^CONDITIONS GÉNÉRALES DE VENTE$/i.test(p));
    doc.addPage();fil(doc,C.vert);doc.rect(0,0,PW,16,"F");doc.setFont("helvetica","bold");doc.setFontSize(11);txt(doc,C.blanc);doc.text("CONDITIONS GÉNÉRALES DE VENTE",M,10.2,{charSpace:1});y=25;
    for(const p of paragraphs){doc.setFont("helvetica",/^Article\s+\d+/i.test(p)?"bold":"normal");doc.setFontSize(8);txt(doc,/^Article\s+\d+/i.test(p)?C.vert:[60,68,63]);const rows=doc.splitTextToSize(p,W) as string[];const h=rows.length*3.7+4;if(y+h>PH-18){doc.addPage();fil(doc,C.vert);doc.rect(0,0,PW,16,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);txt(doc,C.blanc);doc.text("CONDITIONS GÉNÉRALES DE VENTE (SUITE)",M,10.2);y=25;}doc.text(rows,M,y);y+=h;}
  }
  if(bordereau){
    doc.addPage();const bx=M,by=30,bh=215;doc.setFont("helvetica","normal");doc.setFontSize(7.5);txt(doc,C.gris);doc.text("DÉCOUPER SUIVANT LES POINTILLÉS",M,22,{charSpace:.8});
    drw(doc,C.gris);doc.setLineWidth(.5);doc.setLineDashPattern([2,1.5],0);doc.roundedRect(bx,by,W,bh,2,2,"S");doc.setLineDashPattern([],0);
    doc.setFont("helvetica","bold");doc.setFontSize(14);txt(doc,C.vert);doc.text("BORDEREAU DE RÉTRACTATION",PW/2,by+14,{align:"center",charSpace:.8});
    doc.setFont("helvetica","italic");doc.setFontSize(8);txt(doc,C.gris);doc.text("À renvoyer uniquement si vous souhaitez vous rétracter.",PW/2,by+21,{align:"center"});
    const formLines=bordereau.replace(/^BORDEREAU DE RÉTRACTATION\s*/i,"").replace(/\(À renvoyer uniquement[^)]*\)/i,"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
    let fy=by+34;doc.setFont("helvetica","normal");doc.setFontSize(9);txt(doc,C.ink);
    for(const line of formLines){const rows=doc.splitTextToSize(line,W-16) as string[];const blank=/[.…]{5,}/.test(line);const h=Math.max(blank?12:8,rows.length*4.5+3);if(fy+h>by+bh-10)break;doc.text(rows,bx+8,fy);if(blank){drw(doc,C.clair);doc.setLineWidth(.2);doc.line(bx+8,fy+4,bx+W-8,fy+4);}fy+=h;}
    doc.setFont("helvetica","italic");doc.setFontSize(7);txt(doc,C.gris);doc.text("Conservez une copie de ce document.",PW/2,by+bh-7,{align:"center"});
  }

  // Pied de page commun
  const pages=doc.getNumberOfPages(),footer=[name,siret?`SIRET ${siret}`:"",vat?`TVA ${vat}`:""].filter(Boolean).join(" · ");
  for(let i=1;i<=pages;i++){doc.setPage(i);fil(doc,C.vert);doc.rect(0,0,PW,2.2,"F");drw(doc,C.trait);doc.setLineWidth(.2);doc.line(M,PH-13,PW-M,PH-13);doc.setFont("helvetica","normal");doc.setFontSize(7.1);txt(doc,C.clair);doc.text(safe(footer),M,PH-8);doc.text(safe(`${devis.numero} · Page ${i}/${pages}`),PW-M,PH-8,{align:"right"});}
  return doc;
}

export async function telechargerDevisPDF(devis:Devis,lignes:DevisLigne[],aides:DevisAide[],prospect:Prospect|null,entreprise:Entreprise|null):Promise<void>{
  let logoDataUrl:string|null=null;const logoUrl=devis.emetteur_logo_url||"";
  if(logoUrl&&!logoUrl.startsWith("data:image")){try{const response=await fetch(logoUrl);const blob=await response.blob();logoDataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});}catch{}}
  const doc=genererDevisPDF(devis,lignes,aides,prospect,entreprise,logoDataUrl);doc.save(`${devis.numero}.pdf`);
}
