import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Mail, Plus, Receipt, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { uploadDocument } from '../lib/storage/uploadDocument'
import { genererFacturePDF } from '../lib/pdf/genererFacturePDF'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import type { Devis, DevisLigne, Entreprise, Prospect } from '../types'
import { entrepriseCourante } from '../lib/organisation/entrepriseCourante'

type DevisClient = Devis & { prospect?: Prospect | null; lignes?: DevisLigne[] }
type FactureClient = {
  id: string; devis_id: string; prospect_id: string; numero: string; type_facture: 'acompte'|'demarrage'|'solde'|'autre'
  libelle: string; montant_ht: number; montant_tva: number; montant_ttc: number; taux_tva: number; statut: 'emise'|'payee'|'annulee'; date_emission: string; date_echeance: string|null
  pdf_storage_path: string|null; email_envoye_at: string|null; email_erreur: string|null; created_at: string
  prospect?: Prospect | null; devis_numero?: string | null
}
const TYPE_LABEL: Record<string,string> = { acompte:'Acompte', demarrage:'Démarrage du chantier', solde:'Solde', autre:'Autre' }
const euro = (n: number | null | undefined) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(n)||0)

export function FacturationPage(): JSX.Element {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [factures,setFactures] = useState<FactureClient[]>([])
  const [devis,setDevis] = useState<DevisClient[]>([])
  const [entreprise,setEntreprise] = useState<Entreprise|null>(null)
  const [loading,setLoading] = useState(true)
  const [open,setOpen] = useState(false)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [devisId,setDevisId] = useState('')
  const [typeFacture,setTypeFacture] = useState<FactureClient['type_facture']>('acompte')
  const [libelle,setLibelle] = useState('Acompte sur travaux')
  const [montantHt,setMontantHt] = useState('')
  const [dateEcheance,setDateEcheance] = useState('')
  const [search,setSearch] = useState('')

  async function load(): Promise<void> {
    setLoading(true)
    const invoiceResult = await supabase.from('factures_clients').select('*').order('created_at',{ascending:false})
    const quoteResult = await supabase.from('devis').select('*').eq('statut','signe').order('created_at',{ascending:false})
    const companyResult = await entrepriseCourante('*')
    const prospectResult = await supabase.from('prospects').select('*')
    if (invoiceResult.error) setError(`Chargement des factures impossible : ${invoiceResult.error.message}`)
    if (quoteResult.error) setError(`Chargement des devis signés impossible : ${quoteResult.error.message}`)
    const prospectRows = (prospectResult.data || []) as Prospect[]
    const prospectById = new Map<string, Prospect>(prospectRows.map(p => [p.id,p]))
    const quoteRowsBase = ((quoteResult.data || []) as any[]).filter(q => !q.origine_interne).map(q => ({...q, prospect: prospectById.get(q.prospect_id) || null})) as DevisClient[]
    const quoteIds = quoteRowsBase.map(q => q.id)
    const lineResult = quoteIds.length ? await supabase.from('devis_lignes').select('*').in('devis_id', quoteIds).order('ordre') : { data: [], error: null }
    const linesByQuote = new Map<string, DevisLigne[]>()
    for (const line of (lineResult.data || []) as DevisLigne[]) linesByQuote.set(line.devis_id, [...(linesByQuote.get(line.devis_id) || []), line])
    const quoteRows = quoteRowsBase.map(q => ({ ...q, lignes: linesByQuote.get(q.id) || [] }))
    const quoteById = new Map<string, DevisClient>(quoteRows.map(q => [q.id,q]))
    const invoiceRows = ((invoiceResult.data || []) as any[]).map(f => ({...f, prospect: prospectById.get(f.prospect_id) || null, devis_numero: quoteById.get(f.devis_id)?.numero || null})) as FactureClient[]
    setFactures(invoiceRows)
    setDevis(quoteRows)
    setEntreprise((companyResult.data || null) as Entreprise|null)
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const devisSelectionne = devis.find(d=>d.id===devisId)
  const facturesDuDevis = factures.filter(f=>f.devis_id===devisId && f.statut!=='annulee')
  const montantDejaFacture = facturesDuDevis.reduce((sum,f)=>sum+Number(f.montant_ht||0),0)
  const totalDevisHt = Number(devisSelectionne?.montant_ht||0)
  const resteHt = Math.max(0,totalDevisHt-montantDejaFacture)

  function ouvrirCreation(): void {
    setError(''); setDevisId(''); setTypeFacture('acompte'); setLibelle('Acompte sur travaux'); setMontantHt(''); setDateEcheance(''); setOpen(true)
  }
  function selectDevis(id:string): void {
    setDevisId(id)
    const q=devis.find(x=>x.id===id)
    if (!q) {setMontantHt('');return}
    const already=factures.filter(f=>f.devis_id===id && f.statut!=='annulee').reduce((sum,f)=>sum+Number(f.montant_ht||0),0)
    const remaining=Math.max(0,Number(q.montant_ht||0)-already)
    const amount=typeFacture==='solde'?remaining:typeFacture==='autre'?remaining:Math.min(remaining,Number(q.montant_ht||0)*0.3)
    setMontantHt(amount.toFixed(2))
  }
  function updateType(next: FactureClient['type_facture']): void {
    setTypeFacture(next)
    setLibelle(next==='acompte'?'Acompte sur travaux':next==='demarrage'?'Démarrage du chantier':next==='solde'?'Solde des travaux':'Prestation de rénovation énergétique')
    if (devisSelectionne) setMontantHt((next==='solde'||next==='autre'?resteHt:Math.min(resteHt,totalDevisHt*0.3)).toFixed(2))
  }

  async function envoyerFactureEmail(f: FactureClient): Promise<void> {
    if (!f.prospect?.email) { setError(`Facture ${f.numero} : aucune adresse e-mail client renseignée.`); return }
    if (!f.pdf_storage_path) { setError(`Facture ${f.numero} : PDF introuvable dans le stockage.`); return }
    const {data,error:sendError}=await supabase.functions.invoke('send-invoice',{body:{storagePath:f.pdf_storage_path,recipient:f.prospect.email,invoiceNumber:f.numero,partnerName:`${f.prospect.prenom||''} ${f.prospect.nom||''}`.trim(),dossierId:f.devis_id}})
    if(sendError||data?.error){const message=`Facture créée, mais e-mail non envoyé : ${sendError?.message||data?.error}`;await supabase.from('factures_clients').update({email_erreur:message}).eq('id',f.id);setError(message);return}
    const sentAt=new Date().toISOString()
    await supabase.from('factures_clients').update({email_envoye_at:sentAt,email_erreur:null}).eq('id',f.id)
    setFactures(prev=>prev.map(x=>x.id===f.id?{...x,email_envoye_at:sentAt,email_erreur:null}:x))
    setError(`Facture ${f.numero} envoyée à ${f.prospect.email}.`)
  }

  async function creerFacture(): Promise<void> {
    if(!isAdmin){setError('La création des factures clients est réservée à l’administration.');return}
    if(!devisSelectionne){setError('Sélectionnez un devis signé.');return}
    const ht=Number(montantHt)
    if(!Number.isFinite(ht)||ht<=0){setError('Saisissez un montant HT supérieur à zéro.');return}
    if(ht>resteHt+0.01){setError(`Le montant dépasse le reste du devis (${euro(resteHt)} HT).`);return}
    const client=devisSelectionne.prospect
    if(!client){setError('Le devis ne contient pas les coordonnées du client.');return}
    setSaving(true);setError('')
    try{
      const numResult=await supabase.rpc('next_client_invoice_number')
      const companyResult=await entrepriseCourante('*')
      if(numResult.error||!numResult.data)throw new Error(`Numéro de facture indisponible : ${numResult.error?.message||'aucun numéro renvoyé'}. Appliquez la migration factures_clients.`)
      const company=companyResult.data as Entreprise|null
      const numero=String(numResult.data);const now=new Date()
      const sourceLines = devisSelectionne.lignes || []
      const sourceTotal = sourceLines.reduce((sum,line)=>sum+Number(line.montant_ht||0),0)
      const fallbackRate = Number(devisSelectionne.montant_ht)>0 ? Number(devisSelectionne.montant_tva||0)/Number(devisSelectionne.montant_ht)*100 : 10
      const invoiceLines = sourceLines.length && sourceTotal>0 ? sourceLines.map((line,index) => {
        const previous = sourceLines.slice(0,index).reduce((sum,item)=>sum+Math.round((ht*Number(item.montant_ht||0)/sourceTotal)*100)/100,0)
        const amount = index===sourceLines.length-1 ? Math.round((ht-previous)*100)/100 : Math.round((ht*Number(line.montant_ht||0)/sourceTotal)*100)/100
        return { designation: `${libelle.trim()} — ${line.designation}`, montant_ht: amount, taux_tva: Number(line.tva_taux)||fallbackRate }
      }) : [{ designation: libelle.trim() || TYPE_LABEL[typeFacture], montant_ht: ht, taux_tva: fallbackRate }]
      const montantTva = Math.round(invoiceLines.reduce((sum,line)=>sum+line.montant_ht*line.taux_tva/100,0)*100)/100
      const ttc = Math.round((ht+montantTva)*100)/100
      const tauxMoyen = ht>0 ? Math.round((montantTva/ht*100)*100)/100 : fallbackRate
      const doc=await genererFacturePDF({
        numero,
        dateEmission: now,
        dateEcheance,
        typeLabel: TYPE_LABEL[typeFacture] || typeFacture,
        libelle: libelle.trim(),
        montantHt: ht,
        montantTva,
        montantTtc: ttc,
        lignes: invoiceLines,
        devis: devisSelectionne,
        client,
        entreprise: company,
      })
      const blob=doc.output('blob');doc.save(`${numero}.pdf`)
      const {document:stored,path,error:uploadError}=await uploadDocument(new File([blob],`${numero}.pdf`,{type:'application/pdf'}),{dossierId:devisSelectionne.dossier_id||null,prospectId:client.id,categorie:'Factures clients',type:'pdf'})
      if(uploadError||!stored||!path)throw new Error(`PDF généré, mais archivage impossible : ${uploadError||'chemin manquant'}`)
      const {data:created,error:insertError}=await supabase.from('factures_clients').insert({devis_id:devisSelectionne.id,prospect_id:client.id,numero,type_facture:typeFacture,libelle:libelle.trim(),montant_ht:ht,montant_tva:montantTva,montant_ttc:ttc,taux_tva:tauxMoyen,statut:'emise',date_emission:now.toISOString().slice(0,10),date_echeance:dateEcheance||null,pdf_storage_path:path,created_by:profile?.id||null}).select('*').single()
      if(insertError||!created)throw new Error(`PDF archivé, mais enregistrement de la facture impossible : ${insertError?.message||'erreur inconnue'}`)
      const {error:lineInsertError}=await supabase.from('factures_clients_lignes').insert(invoiceLines.map((line,index)=>({facture_id:created.id,designation:line.designation,quantite:1,prix_unitaire_ht:line.montant_ht,taux_tva:line.taux_tva,montant_ht:line.montant_ht,ordre:index})))
      if(lineInsertError)throw new Error(`Facture créée, mais ses lignes n’ont pas pu être enregistrées : ${lineInsertError.message}`)
      const createdWithRelations={...(created as any),prospect:client,devis_numero:devisSelectionne.numero} as FactureClient
      setFactures(prev=>[createdWithRelations,...prev]);setOpen(false)
      await envoyerFactureEmail(createdWithRelations)
      await load()
    }catch(e:any){setError(e?.message||'Impossible de créer la facture.')}
    finally{setSaving(false)}
  }

  async function marquerPayee(f:FactureClient):Promise<void>{
    if(!isAdmin)return
    const {error}=await supabase.from('factures_clients').update({statut:'payee'}).eq('id',f.id)
    if(error){setError(error.message);return}
    setFactures(prev=>prev.map(x=>x.id===f.id?{...x,statut:'payee'}:x))
  }
  async function annuler(f:FactureClient):Promise<void>{
    if(!isAdmin||f.statut==='annulee')return
    if(!confirm(`Annuler la facture ${f.numero} ? Elle restera conservée dans l'historique.`))return
    const {error}=await supabase.from('factures_clients').update({statut:'annulee'}).eq('id',f.id)
    if(error){setError(error.message);return}
    setFactures(prev=>prev.map(x=>x.id===f.id?{...x,statut:'annulee'}:x))
  }
  const visible=factures.filter(f=>`${f.numero} ${f.prospect?.nom||''} ${f.prospect?.prenom||''} ${f.devis_numero||''}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Facturation client</h1><p className="page-subtitle">Factures d’acompte, de démarrage de chantier et de solde, reliées aux devis signés.</p></div>{isAdmin&&<Button variant="primary" onClick={ouvrirCreation}><Plus size={16}/> Nouvelle facture</Button>}</div>
      {error&&<div className="card card-pad" style={{marginBottom:14,color:error.includes('envoyée')?'#166534':'#b91c1c'}}>{error}</div>}
      <div className="card card-pad" style={{marginBottom:14}}><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une facture, un client ou un devis…"/></div>
      <div className="card">
        {loading?<div className="card-pad text-muted">Chargement des factures…</div>:visible.length===0?<div className="empty-state"><Receipt size={36}/><h3>Aucune facture client</h3><p>Créez une facture à partir d’un devis signé. Le montant reste modifiable, dans la limite du reste à facturer.</p></div>:<div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Facture</th><th>Client</th><th>Devis</th><th>Type</th><th>Montant TTC</th><th>Statut</th><th>E-mail</th><th>Actions</th></tr></thead><tbody>{visible.map(f=><tr key={f.id}><td><strong>{f.numero}</strong><div className="text-xs text-muted">{new Date(`${f.date_emission}T12:00:00`).toLocaleDateString('fr-FR')}</div></td><td>{f.prospect?`${f.prospect.prenom||''} ${f.prospect.nom||''}`.trim():'—'}<div className="text-xs text-muted">{f.prospect?.email||'Pas d’e-mail'}</div></td><td>{f.devis_numero||'—'}</td><td>{TYPE_LABEL[f.type_facture]||f.type_facture}</td><td>{euro(Number(f.montant_ttc ?? (Number(f.montant_ht)*(1+Number(f.taux_tva)/100))))}</td><td><span className={`badge ${f.statut==='payee'?'badge-success':f.statut==='annulee'?'badge-error':'badge-warning'}`}>{f.statut==='payee'?'Payée':f.statut==='annulee'?'Annulée':'Émise'}</span></td><td>{f.email_envoye_at?<span className="text-sm" style={{color:'#166534'}}>Envoyée</span>:<span className="text-sm text-muted">{f.email_erreur||'Non envoyée'}</span>}</td><td><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{isAdmin&&f.statut!=='annulee'&&<Button size="sm" variant="secondary" onClick={()=>void envoyerFactureEmail(f)}><Mail size={13}/>{f.email_envoye_at?'Renvoyer':'Envoyer'}</Button>}{isAdmin&&f.statut==='emise'&&<Button size="sm" variant="ghost" onClick={()=>void marquerPayee(f)}><CheckCircle2 size={13}/> Payée</Button>}{isAdmin&&f.statut!=='annulee'&&<Button size="sm" variant="ghost" onClick={()=>void annuler(f)}><XCircle size={13}/> Annuler</Button>}{f.pdf_storage_path&&<Button size="sm" variant="ghost" onClick={()=>{const {data}=supabase.storage.from('documents').getPublicUrl(f.pdf_storage_path!);window.open(data.publicUrl,'_blank','noopener,noreferrer')}}><Download size={13}/> PDF</Button>}</div></td></tr>)}</tbody></table></div>}
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="Créer une facture client" width={680} footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Annuler</Button><Button variant="primary" onClick={()=>void creerFacture()} disabled={saving||!devisId}>{saving?'Création…':'Générer la facture'}</Button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <label className="field"><span>Devis signé</span><select className="input" value={devisId} onChange={e=>selectDevis(e.target.value)}><option value="">Sélectionner un devis</option>{devis.map(d=><option key={d.id} value={d.id}>{d.numero} — {d.prospect?`${d.prospect.prenom} ${d.prospect.nom}`:'Client'} — {euro(d.montant_ht)} HT</option>)}</select></label>
          {devisSelectionne&&<div className="card card-pad text-sm"><div><strong>Devis :</strong> {devisSelectionne.numero} · Total HT {euro(totalDevisHt)}</div><div><strong>Déjà facturé :</strong> {euro(montantDejaFacture)} HT · <strong>Reste :</strong> {euro(resteHt)} HT</div></div>}
          <label className="field"><span>Type de facture</span><select className="input" value={typeFacture} onChange={e=>updateType(e.target.value as FactureClient['type_facture'])}><option value="acompte">Acompte</option><option value="demarrage">Démarrage du chantier</option><option value="solde">Solde</option><option value="autre">Autre</option></select></label>
          <label className="field"><span>Libellé</span><input className="input" value={libelle} onChange={e=>setLibelle(e.target.value)}/></label>
          <label className="field"><span>Montant HT (€)</span><input className="input" type="number" min="0.01" step="0.01" value={montantHt} onChange={e=>setMontantHt(e.target.value)}/></label>
          <label className="field"><span>Date d’échéance (facultative)</span><input className="input" type="date" value={dateEcheance} onChange={e=>setDateEcheance(e.target.value)}/></label>
          <p className="text-xs text-muted">Les taux de TVA sont repris des lignes du devis signé, au prorata du montant facturé. Le PDF est archivé dans les documents du client.</p>
        </div>
      </Modal>
    </div>
  )
}
