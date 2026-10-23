import jsPDF from "jspdf";
import type { Devis, Prospect, Entreprise } from "../../types";

type RGB = readonly [number,number,number];
const C={ink:[24,34,29] as RGB,vert:[31,69,54] as RGB,moyen:[62,120,92] as RGB,fond:[246,249,247] as RGB,gris:[112,122,116] as RGB,clair:[168,176,171] as RGB,trait:[222,228,224] as RGB,blanc:[255,255,255] as RGB};
const txt=(d:jsPDF,c:RGB)=>d.setTextColor(...c);
const fil=(d:jsPDF,c:RGB)=>d.setFillColor(...c);
const drw=(d:jsPDF,c:RGB)=>d.setDrawColor(...c);
const safe=(v:unknown)=>String(v??"").replace(/·/g,".").replace(/[‑‐]/g,"-").replace(/[  ]/g," ");
const euro=(n:number)=>{const v=Number(n)||0;const [a,b]=Math.abs(v).toFixed(2).split(".");return `${v<0?"-":""}${a.replace(/\B(?=(\d{3})+(?!\d))/g," ")},${b} €`;};
const label=(d:jsPDF,s:string,x:number,y:number)=>{d.setFont("helvetica","bold");d.setFontSize(6.8);txt(d,C.moyen);d.text(s.toUpperCase(),x,y,{charSpace:.6});};

export type LigneFacturePDF={designation:string;montant_ht:number;taux_tva:number};
export type DonneesFacturePDF={
 numero:string;dateEmission:Date;dateEcheance:string;typeLabel:string;libelle:string;
 montantHt:number;montantTva:number;montantTtc:number; lignes:LigneFacturePDF[];
 devis:Devis; client:Prospect; entreprise:Entreprise|null;
};

export function genererFacturePDF(data:DonneesFacturePDF):jsPDF{
 const {numero,dateEmission,dateEcheance,typeLabel,libelle,montantHt,montantTva,montantTtc,lignes,devis,client,entreprise}=data;
 const doc=new jsPDF({unit:"mm",format:"a4"}),PW=doc.internal.pageSize.getWidth(),PH=doc.internal.pageSize.getHeight(),M=16,W=PW-2*M;
 const partner=devis.emetteur_type==="partenaire";
 const name=devis.emetteur_nom_affichage||entreprise?.raison_sociale||"Mon entreprise";
 const legal=devis.emetteur_raison_sociale||entreprise?.raison_sociale||name;
 const form=devis.emetteur_forme_juridique||entreprise?.forme_juridique||"";
 const address=devis.emetteur_adresse||entreprise?.adresse||"";
 const city=[devis.emetteur_code_postal||entreprise?.code_postal,devis.emetteur_ville||entreprise?.ville].filter(Boolean).join(" ");
 const siret=devis.emetteur_siret||entreprise?.siret||"",vat=devis.emetteur_numero_tva||entreprise?.numero_tva||"";
 const phone=devis.emetteur_telephone||entreprise?.telephone||"",email=devis.emetteur_email||entreprise?.email||"";
 const date=(v:Date|string)=> (v instanceof Date ? v : new Date(v)).toLocaleDateString("fr-FR");
 let y=0;
 // Identité et en-tête
 const logo=devis.emetteur_logo_url||entreprise?.logo_url||"";
 if(logo.startsWith("data:image")){try{doc.addImage(logo,logo.includes("image/png")?"PNG":"JPEG",M,13,22,22,undefined,"FAST");}catch{}}
 const xName=logo.startsWith("data:image")?M+27:M;
 doc.setFont("helvetica","bold");doc.setFontSize(17);txt(doc,C.vert);doc.text(safe(name),xName,23);
 doc.setFont("helvetica","normal");doc.setFontSize(8.5);txt(doc,C.gris);
 const sub=[form,legal!==name?legal:""].filter(Boolean).join(" · ");if(sub)doc.text(safe(sub),xName,28.5);
 doc.setFont("helvetica","bold");doc.setFontSize(29);txt(doc,C.ink);doc.text("FACTURE",PW-M,23,{align:"right",charSpace:1.4});
 doc.setFont("helvetica","normal");doc.setFontSize(9.5);txt(doc,C.gris);doc.text(safe(`N° ${numero}`),PW-M,30,{align:"right"});doc.text(safe(`Émise le ${date(dateEmission)}`),PW-M,36,{align:"right"});
 drw(doc,C.vert);doc.setLineWidth(.5);doc.line(M,42,PW-M,42);
 // Synthèse
 y=48;const h=17,cw=W/3;fil(doc,C.fond);doc.roundedRect(M,y,W,h,2,2,"F");
 const cells:[string,string][]=[["Facture liée au devis",devis.numero],["Nature",typeLabel],["Total TTC",euro(montantTtc)]];
 cells.forEach(([k,v],i)=>{const x=M+i*cw+5;label(doc,k,x,y+6);doc.setFont("helvetica","bold");doc.setFontSize(i===2?11.5:9.3);txt(doc,C.ink);doc.text(safe(v),x,y+13);if(i>0){drw(doc,C.trait);doc.line(M+i*cw,y+4,M+i*cw,y+h-4);}});
 y+=h+10;
 // Émetteur et client
 const col=(W-12)/2,x2=M+col+12;label(doc,"Émetteur",M,y);label(doc,"Facturé à",x2,y);drw(doc,C.trait);doc.line(M,y+2,M+col,y+2);doc.line(x2,y+2,PW-M,y+2);
 let ya=y+8,yb=y+8;doc.setFont("helvetica","bold");doc.setFontSize(10.5);txt(doc,C.ink);doc.text(safe(legal),M,ya);ya+=5;doc.text(safe(`${client.civilite||""} ${client.prenom||""} ${client.nom||""}`.replace(/\s+/g," ").trim()),x2,yb);yb+=5;
 const issuer=[address,city,siret?`SIRET : ${siret}`:"",vat?`TVA intracommunautaire : ${vat}`:"",[phone,email].filter(Boolean).join(" · ")].filter(Boolean);
 const customer=[client.raison_sociale||"",client.adresse_rue||client.adresse,[client.code_postal,client.ville].filter(Boolean).join(" "),client.email||"",client.telephone||""].filter(Boolean);
 doc.setFont("helvetica","normal");doc.setFontSize(8.5);txt(doc,C.gris);
 for(const line of issuer)for(const s of doc.splitTextToSize(safe(line),col) as string[]){doc.text(s,M,ya);ya+=4.2;}
 for(const line of customer)for(const s of doc.splitTextToSize(safe(line),col) as string[]){doc.text(s,x2,yb);yb+=4.2;}
 y=Math.max(ya,yb)+10;
 // Lignes de facture
 label(doc,"Détail de la facturation",M,y);y+=7;
 const xDesc=M,xAmount=PW-M;doc.setFillColor(...C.fond);doc.rect(M,y-4,W,8,"F");doc.setFont("helvetica","bold");doc.setFontSize(7);txt(doc,C.gris);doc.text("DÉSIGNATION",xDesc+2,y+1);doc.text("MONTANT HT",xAmount-2,y+1,{align:"right"});y+=9;
 for(const line of lignes){const rows=doc.splitTextToSize(safe(line.designation),W-48) as string[];const h=Math.max(8,rows.length*4.2+3);if(y+h>PH-48){footer();doc.addPage();y=23;doc.setFont("helvetica","bold");doc.setFontSize(9);txt(doc,C.vert);doc.text(safe(`FACTURE ${numero} — SUITE`),M,y);y+=10;doc.setFont("helvetica","normal");}
   doc.setFont("helvetica","normal");doc.setFontSize(8.5);txt(doc,C.ink);doc.text(rows,M+2,y);doc.text(euro(line.montant_ht),xAmount-2,y,{align:"right"});y+=h;drw(doc,C.trait);doc.setLineWidth(.2);doc.line(M,y-2,PW-M,y-2);}
 y+=4;
 const tx=PW-M-82;const totalRows:[string,string,boolean][]=[["Total HT",euro(montantHt),false],["TVA",euro(montantTva),false],["TOTAL TTC",euro(montantTtc),true]];
 for(const [k,v,bold] of totalRows){if(bold){drw(doc,C.trait);doc.line(tx,y-4,PW-M,y-4);}doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(bold?11:9);txt(doc,bold?C.ink:C.gris);doc.text(k,tx,y);txt(doc,C.ink);doc.text(v,PW-M,y,{align:"right"});y+=7;}
 y+=4;fil(doc,C.vert);doc.roundedRect(tx-4,y-2,86,15,2,2,"F");label(doc,"À régler",tx+1,y+4,[190,215,200]);doc.setFont("helvetica","bold");doc.setFontSize(14);txt(doc,C.blanc);doc.text(euro(montantTtc),PW-M-3,y+9,{align:"right"});y+=22;
 // Paiement et mentions
 const payment=devis.conditions_paiement||entreprise?.devis_conditions_paiement_defaut||entreprise?.conditions_paiement_defaut||"Selon les conditions convenues";
 const due=dateEcheance?date(`${dateEcheance}T12:00:00`):"Selon les conditions du devis";
 const legalLines=[`Nature : ${typeLabel} — ${libelle}.`,`Échéance : ${due}.`,`Conditions de paiement : ${payment}`,`Pénalités de retard : ${entreprise?.taux_penalite_retard||"selon les conditions légales applicables"}.`,`Escompte : ${entreprise?.escompte_defaut||"néant"}.`];
 if(client.type_prospect==="professionnel")legalLines.push("Indemnité forfaitaire pour frais de recouvrement : 40 € dans les conditions prévues par le Code de commerce.");
 if(!partner&&(entreprise?.iban||entreprise?.bic||entreprise?.banque)){legalLines.push(`Banque : ${entreprise?.banque||"—"}`,`IBAN : ${entreprise?.iban||"—"}`,`BIC : ${entreprise?.bic||"—"}`);}
 const maxY=PH-23;for(const line of legalLines){const rows=doc.splitTextToSize(safe(line),W) as string[];if(y+rows.length*4>maxY){footer();doc.addPage();y=24;}doc.setFont("helvetica","normal");doc.setFontSize(8);txt(doc,C.gris);doc.text(rows,M,y);y+=rows.length*4+2;}
 function footer(){/* pied de page final ajouté après le calcul du nombre de pages */}
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);fil(doc,C.vert);doc.rect(0,0,PW,2.2,"F");drw(doc,C.trait);doc.setLineWidth(.2);doc.line(M,PH-13,PW-M,PH-13);doc.setFont("helvetica","normal");doc.setFontSize(7.1);txt(doc,C.clair);doc.text(safe([name,siret?`SIRET ${siret}`:"",vat?`TVA ${vat}`:""].filter(Boolean).join(" · ")),M,PH-8);doc.text(safe(`${numero} · Page ${i}/${pages}`),PW-M,PH-8,{align:"right"});}
 return doc;
}
