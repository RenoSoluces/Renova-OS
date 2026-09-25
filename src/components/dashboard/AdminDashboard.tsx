import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Ban, BellRing, Bot, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, FileCheck2, FileOutput, Gauge, RefreshCw, Send, ShieldCheck, Sparkles, Target, TrendingUp, Users, Trophy } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabase'
import { euro, timeAgo } from '../../lib/crm/constants'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { Devis, Prospect, Commission, Dossier } from '../../types'

interface Installer { id:string; nom:string; telephone?:string; email?:string; ville?:string; zone_intervention?:string; actif:boolean }
interface Bareme { id:string; type:string; produit_id:string|null; commercial_id:string|null; montant_societe:number; montant_commercial:number; pourcentage_commercial:number|null; actif:boolean; priorite:number }
interface LeadScore { installer:Installer; leads:number; signed:number; lost:number; overdue:number; conversion:number; score:number; health:string }
interface CommercialScore { id:string; nom:string; leads:number; signed:number; lost:number; conversion:number }
interface AlertItem { id:string; kind:'sleep'|'litige'|'payment'; title:string; detail:string; action:string; prospectId?:string }

export function AdminDashboard({ onNavigate }:{onNavigate:(p:any)=>void}) {
  const [prospects,setProspects]=useState<Prospect[]>([]),[devis,setDevis]=useState<Devis[]>([]),[dossiers,setDossiers]=useState<Dossier[]>([]),[commissions,setCommissions]=useState<Commission[]>([])
  const [installateurs,setInstallateurs]=useState<Installer[]>([]),[baremes,setBaremes]=useState<Bareme[]>([]),[lines,setLines]=useState<any[]>([]),[interactions,setInteractions]=useState<any[]>([]),[profiles,setProfiles]=useState<any[]>([])
  const [loading,setLoading]=useState(true),[dispatcherOpen,setDispatcherOpen]=useState(false),[dispatching,setDispatching]=useState(false),[invoiceOpen,setInvoiceOpen]=useState<Commission|null>(null),[tickerRefresh,setTickerRefresh]=useState(0),[dispatcherSelections,setDispatcherSelections]=useState<Record<string,string>>({})
  async function load(){
    setLoading(true)
    try {
      const queries = [
        supabase.from('prospects').select('*').order('created_at',{ascending:false}),
        supabase.from('devis').select('*').order('created_at',{ascending:false}),
        supabase.from('dossiers').select('*').order('created_at',{ascending:false}),
        supabase.from('commissions').select('*, commercial:profiles(id, nom_complet, couleur)').order('date_generation',{ascending:false}),
        supabase.from('installateurs').select('*').eq('actif',true).order('nom'),
        supabase.from('commission_bareme').select('*').eq('actif',true),
        supabase.from('devis_lignes').select('id,devis_id,produit_id,montant_ht,ordre'),
        supabase.from('interactions').select('*, prospect:prospects(prenom,nom)').order('created_at',{ascending:false}).limit(15),
        supabase.from('profiles').select('id,nom_complet,role,objectif_mensuel').in('role',['commercial','manager','admin']).order('nom_complet'),
      ]
      const [p,d,ds,c,i,b,l,ints,prof] = await Promise.allSettled(queries)
      const dataOf = (r:any) => r.status === 'fulfilled' ? (r.value?.data || []) : []
      const errorOf = (r:any) => r.status === 'fulfilled' ? r.value?.error : r.reason
      const errors = [p,d,ds,c,i,b,l,ints,prof].map(errorOf).filter(Boolean)
      if (errors.length) console.warn('Certaines données du dashboard admin sont indisponibles:', errors)
      setProspects(dataOf(p) as Prospect[]); setDevis(dataOf(d) as Devis[]); setDossiers(dataOf(ds) as Dossier[]); setCommissions(dataOf(c) as Commission[])
      setInstallateurs(dataOf(i) as Installer[]); setBaremes(dataOf(b) as Bareme[]); setLines(dataOf(l)); setInteractions(dataOf(ints)); setProfiles(dataOf(prof))
    } catch (error) { console.error('Erreur chargement dashboard admin:', error) } finally { setLoading(false) }
  }
  useEffect(()=>{load(); const timer=window.setInterval(()=>load(),30000); return ()=>window.clearInterval(timer)},[])

  const activeQuotes=useMemo(()=>devis.filter(d=>['envoye','brouillon'].includes(d.statut)),[devis])
  const signedQuotes=useMemo(()=>devis.filter(d=>d.statut==='signe'),[devis])
  function expectedSocietyCommission(d:Devis){
    const line=lines.filter(l=>l.devis_id===d.id).sort((a,b)=>(a.ordre||0)-(b.ordre||0))[0],prospect=prospects.find(p=>p.id===d.prospect_id)
    const r=baremes.filter(b=>b.type==='devis_signe'&&b.actif&&(!b.commercial_id||b.commercial_id===prospect?.commercial_id)&&(!b.produit_id||b.produit_id===line?.produit_id)).sort((a,b)=>(Number(!!b.commercial_id)+Number(!!b.produit_id))-(Number(!!a.commercial_id)+Number(!!a.produit_id))||b.priorite-a.priorite)[0]
    if (r?.montant_societe) return Number(r.montant_societe)
    if (r?.pourcentage_commercial) return Number(r.pourcentage_commercial)/100 * Number(d.montant_ht||0)
    return 0
  }
  const latent=activeQuotes.reduce((s,d)=>s+expectedSocietyCommission(d),0)

  // Une commission « à facturer » n'est disponible qu'après l'installation réelle du dossier.
  const installedDevisIds=new Set(dossiers.filter(d=>d.statut==='installe'&&d.devis_id).map(d=>d.devis_id as string))
  const toInvoice=commissions.filter(c=>c.statut!=='annulee'&&c.type==='devis_signe'&&!(c as any).facturee_at&&c.reference_type==='devis'&&c.reference_id&&installedDevisIds.has(c.reference_id))
  // Les VT sont incluses ici : elles ont une vraie commission dès leur validation/qualification et ne doivent pas disparaître du cockpit.
  const commissionsEnCours=commissions.filter(c=>c.statut!=='annulee'&&c.statut!=='payee'&&!(c as any).facturee_at&&!c.date_paiement_commercial&&!c.date_paiement_societe)
  const outstanding=commissions.filter(c=>c.statut!=='annulee'&&(c as any).facturee_at&&!c.date_paiement_societe).reduce((s,c)=>s+Number(c.montant_societe||0),0)
  const activeLeads=prospects.filter(p=>!['Signé','Installé','Perdu','Refusé'].includes(p.statut)),signedByProspect=new Set(signedQuotes.map(d=>d.prospect_id))
  const leaderboard:LeadScore[]=installateurs.map(inst=>{const assigned=prospects.filter(p=>(p as any).installateur_id===inst.id),signed=assigned.filter(p=>signedByProspect.has(p.id)).length,lost=assigned.filter(p=>['Perdu','Refusé'].includes(p.statut)).length,overdue=0,conversion=assigned.length?Math.round(signed/assigned.length*100):0,score=Math.max(0,Math.min(100,conversion*.75+Math.max(0,30-overdue*10))),health=score>=80?'A':score>=65?'B':score>=50?'C':score>=35?'D':score>0?'E':'F';return{installer:inst,leads:assigned.length,signed,lost,overdue,conversion,score,health}}).sort((a,b)=>b.score-a.score)
  const commercialLeaderboard:CommercialScore[]=profiles.filter(p=>p.role==='commercial').map(p=>{const assigned=prospects.filter(x=>x.commercial_id===p.id),signed=assigned.filter(x=>signedByProspect.has(x.id)).length,lost=assigned.filter(x=>['Perdu','Refusé'].includes(x.statut)).length;return{id:p.id,nom:p.nom_complet||'Commercial',leads:assigned.length,signed,lost,conversion:assigned.length?Math.round(signed/assigned.length*100):0}}).sort((a,b)=>b.conversion-a.conversion||b.signed-a.signed)
  const alerts:AlertItem[]=useMemo(()=>prospects.filter(p=>p.temperature==='chaud'&&p.derniere_interaction_at&&Date.now()-new Date(p.derniere_interaction_at).getTime()>7*86400000).slice(0,4).map(p=>({id:`sleep-${p.id}`,kind:'sleep' as const,title:`Lead chaud sans suivi — ${p.prenom} ${p.nom}`,detail:`${(p as any).installateur_id?'Partenaire attribué':'Partenaire non attribué'} · aucune mise à jour depuis plus de 7 jours`,action:'Relancer',prospectId:p.id})),[prospects])
  const ticker=useMemo(()=>{const items:any[]=[];commissions.slice(0,8).forEach(c=>items.push({id:`c-${c.id}`,at:c.date_generation,icon:<CircleDollarSign size={15}/>,text:`Commission générée — ${c.libelle}`,value:`+ ${euro(c.montant_societe)}`}));devis.filter(d=>d.statut==='signe').slice(0,8).forEach(d=>items.push({id:`d-${d.id}`,at:d.signature_date||d.created_at,icon:<FileCheck2 size={15}/>,text:`Devis ${d.numero||''} signé`,value:euro(d.montant_ttc)}));interactions.slice(0,8).forEach(i=>items.push({id:`i-${i.id}`,at:i.created_at,icon:<Activity size={15}/>,text:`${i.prospect?.prenom||''} ${i.prospect?.nom||''} — ${i.contenu}`,value:''}));return items.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime()).slice(0,10)},[commissions,devis,interactions,tickerRefresh])
  async function saveCommercialObjective(profileId:string, value:number){
    const safe=Math.max(0,Number.isFinite(value)?value:0)
    const {error}=await supabase.from('profiles').update({objectif_mensuel:safe}).eq('id',profileId)
    if(error){alert(error.message);return}
    setProfiles(prev=>prev.map(p=>p.id===profileId?{...p,objectif_mensuel:safe}:p))
  }

  async function dispatchLead(prospectId:string){
    const chosen=dispatcherSelections[prospectId]
    if(!chosen)return
    setDispatching(true)
    const {error}=await supabase.from('prospects').update({installateur_id:chosen}).eq('id',prospectId)
    if(error) alert(error.message)
    else { setDispatcherSelections(m=>({...m,[prospectId]:''})); await load() }
    setDispatching(false)
  }
  function generateInvoice(c:Commission){const doc=new jsPDF(),now=new Date(),num=`FAC-COM-${now.getFullYear()}-${c.id.slice(0,6).toUpperCase()}`;doc.setFontSize(22);doc.text('RENOVA OS',20,25);doc.setFontSize(12);doc.text('FACTURE DE COMMISSION',20,35);doc.setFontSize(10);doc.text(`N° ${num}`,20,45);doc.text(`Date : ${now.toLocaleDateString('fr-FR')}`,20,52);doc.text(c.libelle||'Commission',20,75);doc.text(`Montant de la commission : ${euro(c.montant_societe)}`,20,90);doc.text('Règlement : selon conditions contractuelles.',20,110);doc.save(`${num}.pdf`);supabase.from('commissions').update({facturee_at:now.toISOString(),facture_numero:num}).eq('id',c.id).then(()=>{setInvoiceOpen(null);load()})}
  if(loading)return <div className="admin-dashboard-loading"><RefreshCw className="spin" size={22}/> Chargement du cockpit administrateur…</div>
  return <div className="admin-dashboard">
    <div className="admin-dashboard-hero"><div><div className="admin-dashboard-kicker"><Sparkles size={13}/> ADMIN CONTROL CENTER</div><h1>Le cockpit de votre activité</h1><p>Cash, partenaires, relances et signatures — tout ce qui mérite une action est visible ici.</p></div><div className="admin-hero-actions"><Button variant="ghost" onClick={()=>load()}><RefreshCw size={15}/> Actualiser</Button><Button variant="primary" onClick={()=>setDispatcherOpen(true)}><Bot size={15}/> Dispatcher un lead</Button></div></div>
    <section className="cash-grid">
      <button className="cash-card cash-latent" onClick={()=>onNavigate('devis')}><div className="cash-card-top"><span><TrendingUp size={17}/> COMMISSIONS EN COURS</span><ArrowUpRight size={16}/></div><strong>{euro(commissionsEnCours.reduce((s,c)=>s+Number(c.montant_societe||0),0))}</strong><small>Commissions générées et encore en cours de traitement · VT incluses</small><div className="cash-glow"/></button>
      <button className="cash-card cash-invoice" onClick={()=>onNavigate('commissions')}><div className="cash-card-top"><span><FileOutput size={17}/> COMMISSIONS À FACTURER</span><ArrowUpRight size={16}/></div><strong>{euro(toInvoice.reduce((s,c)=>s+Number(c.montant_societe||0),0))}</strong><small>Uniquement les dossiers réellement installés</small><div className="cash-glow"/></button>
      <button className="cash-card cash-outstanding" onClick={()=>onNavigate('commissions')}><div className="cash-card-top"><span><Clock3 size={17}/> ENCOURS INSTALLATEURS</span><ArrowUpRight size={16}/></div><strong>{euro(outstanding)}</strong><small>Facturé mais non encore réglé</small><div className="cash-glow"/></button>
    </section>
    <div className="admin-dashboard-columns"><section className="admin-panel action-wall"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><BellRing size={14}/> ACTION ADMIN</div><h2>Mur des relances & blocages</h2></div><span className="admin-count-badge">{alerts.length}</span></div>{alerts.length===0?<div className="admin-empty"><ShieldCheck size={22}/><div><strong>Aucune anomalie critique</strong><span>Les leads chauds sont suivis.</span></div></div>:alerts.map(a=><div className="admin-alert" key={a.id}><span className={`admin-alert-icon ${a.kind}`}><AlertTriangle size={17}/></span><div className="admin-alert-copy"><strong>{a.title}</strong><span>{a.detail}</span></div><button className="admin-alert-btn" onClick={()=>a.prospectId&&onNavigate('prospects')}>{a.action}<ChevronRight size={14}/></button></div>)}{activeLeads.filter(p=>!(p as any).installateur_id).slice(0,2).map(p=><div className="admin-alert" key={`unassigned-${p.id}`}><span className="admin-alert-icon sleep"><Target size={17}/></span><div className="admin-alert-copy"><strong>Lead non attribué — {p.prenom} {p.nom}</strong><span>{p.code_postal||'Adresse inconnue'} · prêt à être dispatché.</span></div><button className="admin-alert-btn" onClick={()=>setDispatcherOpen(true)}>Dispatcher<ChevronRight size={14}/></button></div>)}</section>
      <section className="admin-panel leaderboard-panel"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><Gauge size={14}/> DATAVIZ PARTENAIRES</div><h2>Leaderboard des installateurs</h2></div><span className="admin-live"><i/> LIVE</span></div><div className="leaderboard-list">{leaderboard.length===0?<div className="admin-empty"><Users size={22}/><div><strong>Aucun installateur actif</strong><span>Ajoutez vos partenaires.</span></div></div>:leaderboard.slice(0,6).map((x,idx)=><div className="leader-row" key={x.installer.id}><div className="leader-rank">{idx+1}</div><div className="leader-name"><strong>{x.installer.nom}</strong><span>{x.leads} leads · {x.signed} signés · {x.lost} perdus</span></div><div className="leader-bar"><div style={{width:`${x.conversion}%`}}/></div><strong className="leader-pct">{x.conversion}%</strong><span className={`health health-${x.health}`}>{x.health}</span></div>)}</div>{leaderboard[0]&&<div className="black-hole"><div><span className="black-hole-title"><Ban size={14}/> BLACK HOLE</span><strong>{leaderboard.reduce((s,x)=>s+x.lost,0)} leads perdus</strong></div><span>Surveillez les partenaires qui laissent dormir leur portefeuille.</span></div>}<button className="admin-link-btn" onClick={()=>onNavigate('partenaires')}>Gérer les partenaires <ArrowUpRight size={14}/></button></section></div>
    <section className="admin-panel leaderboard-panel">
      <div className="admin-panel-head"><div><div className="admin-panel-kicker"><Target size={14}/> OBJECTIFS COMMERCIAUX</div><h2>Objectif mensuel</h2></div><span className="admin-live"><i/> ADMIN</span></div>
      <div className="admin-mini-stat-grid">
        {profiles.filter(p=>p.role==='commercial').map(p=><div key={p.id}>
          <span>{p.nom_complet||'Commercial'}</span>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
            <input className="pipeline-inline-input" type="number" min="0" step="100" defaultValue={p.objectif_mensuel ?? 10000} onBlur={e=>saveCommercialObjective(p.id,Number(e.currentTarget.value))} onKeyDown={e=>{if(e.key==='Enter') e.currentTarget.blur()}} aria-label={`Objectif mensuel de ${p.nom_complet||'commercial'}`} />
            <strong>€</strong>
          </div>
          <small>Enregistré pour le dashboard du commercial</small>
        </div>)}
        {profiles.filter(p=>p.role==='commercial').length===0&&<div className="admin-empty"><Users size={20}/><div><strong>Aucun commercial</strong><span>Ajoutez un commercial pour définir son objectif.</span></div></div>}
      </div>
    </section>
    <div className="admin-dashboard-columns admin-dashboard-columns-equal">
      <section className="admin-panel leaderboard-panel"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><Trophy size={14}/> DATAVIZ COMMERCIAUX</div><h2>Leaderboard des commerciaux</h2></div><span className="admin-live"><i/> LIVE</span></div><div className="leaderboard-list">{commercialLeaderboard.length===0?<div className="admin-empty"><Users size={22}/><div><strong>Aucun commercial</strong><span>Les commerciaux apparaîtront ici dès qu'ils ont des leads.</span></div></div>:commercialLeaderboard.slice(0,6).map((x,idx)=><div className="leader-row" key={x.id}><div className="leader-rank">{idx+1}</div><div className="leader-name"><strong>{x.nom}</strong><span>{x.leads} leads · {x.signed} signés · {x.lost} perdus</span></div><div className="leader-bar"><div style={{width:`${x.conversion}%`}}/></div><strong className="leader-pct">{x.conversion}%</strong></div>)}</div></section>
      <section className="admin-panel leaderboard-panel"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><CircleDollarSign size={14}/> COMMISSIONS</div><h2>Commissions générées</h2></div><span className="admin-count-badge">{commissionsEnCours.length}</span></div><div className="admin-mini-stat-grid"><div><span>En cours</span><strong>{euro(commissionsEnCours.reduce((s,c)=>s+Number(c.montant_societe||0),0))}</strong><small>VT incluses</small></div><div><span>À facturer</span><strong>{euro(toInvoice.reduce((s,c)=>s+Number(c.montant_societe||0),0))}</strong><small>après installation</small></div></div></section>
    </div>
    <section className="admin-panel invoice-panel"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><FileOutput size={14}/> FACTURATION</div><h2>Commissions à facturer</h2></div><button className="admin-link-btn" onClick={()=>onNavigate('commissions')}>Voir tout <ArrowUpRight size={14}/></button></div>{toInvoice.length===0?<div className="admin-empty"><CheckCircle2 size={22}/><div><strong>Aucune commission prête à facturer</strong><span>Un devis signé devient facturable après installation réelle du dossier.</span></div></div>:<div className="invoice-list">{toInvoice.slice(0,5).map(c=><div className="invoice-row" key={c.id}><div className="invoice-icon"><FileCheck2 size={17}/></div><div><strong>{c.libelle}</strong><span>{timeAgo(c.date_generation)}</span></div><strong className="invoice-amount">{euro(c.montant_societe)}</strong><Button size="sm" variant="secondary" onClick={()=>setInvoiceOpen(c)}><FileOutput size={14}/> Générer facture</Button></div>)}</div>}</section>
    <section className="admin-panel ticker-panel"><div className="admin-panel-head"><div><div className="admin-panel-kicker"><Activity size={14}/> FLUX CRM</div><h2>Live ticker des signatures</h2></div><button className="admin-link-btn" onClick={()=>{setTickerRefresh(x=>x+1);load()}}><RefreshCw size={14}/> Actualiser</button></div><div className="ticker-track">{ticker.map(item=><div className="ticker-item" key={item.id}><span className="ticker-icon">{item.icon}</span><span className="ticker-text">{item.text}</span><span className="ticker-time">{timeAgo(item.at)}</span>{item.value&&<strong>{item.value}</strong>}</div>)}</div></section>
    <Modal open={dispatcherOpen} onClose={()=>setDispatcherOpen(false)} title="Dispatcher les prospects" footer={<Button variant="ghost" onClick={()=>setDispatcherOpen(false)}>Fermer</Button>}>
      <div className="dispatcher-intro"><Bot size={28}/><div><strong>Choisissez le partenaire</strong><span>La suggestion automatique reste disponible, mais l’Admin garde toujours la main sur l’attribution.</span></div></div>
      {activeLeads.filter(p=>!(p as any).installateur_id).slice(0,12).map(p=>{
        const suggested=leaderboard.map(x=>{const sameZip=(x.installer.zone_intervention||'').split(/[,; ]+/).some(z=>z&&p.code_postal?.startsWith(z));return {...x,score:x.conversion*.7+(sameZip?25:0)+(x.overdue===0?15:0)}}).sort((a,b)=>b.score-a.score)[0]
        return <div className="dispatcher-row dispatcher-row-select" key={p.id}>
          <div><strong>{p.prenom} {p.nom}</strong><span>{p.code_postal||'—'} · {p.temperature||'température inconnue'}</span></div>
          <select className="pipeline-inline-input dispatcher-select" value={dispatcherSelections[p.id]||''} onChange={e=>setDispatcherSelections(m=>({...m,[p.id]:e.target.value}))}>
            <option value="">Choisir un partenaire…</option>
            {installateurs.map(i=><option key={i.id} value={i.id}>{i.nom}{suggested?.installer.id===i.id?' · suggestion':''}</option>)}
          </select>
          <Button size="sm" variant="primary" disabled={dispatching||!dispatcherSelections[p.id]} onClick={()=>dispatchLead(p.id)}><Send size={14}/> Attribuer</Button>
        </div>
      })}
      {activeLeads.filter(p=>!(p as any).installateur_id).length===0&&<div className="admin-empty"><CheckCircle2 size={20}/><div><strong>Tout est attribué</strong><span>Aucun lead n’attend d’installateur.</span></div></div>}
    </Modal>
    <Modal open={!!invoiceOpen} onClose={()=>setInvoiceOpen(null)} title="Générer la facture de commission" footer={<><Button variant="ghost" onClick={()=>setInvoiceOpen(null)}>Annuler</Button><Button variant="primary" onClick={()=>invoiceOpen&&generateInvoice(invoiceOpen)}><FileOutput size={15}/> Générer le PDF</Button></>}>{invoiceOpen&&<div className="invoice-preview"><div className="invoice-preview-icon"><FileOutput size={22}/></div><div><strong>{invoiceOpen.libelle}</strong><span>Commission société : {euro(invoiceOpen.montant_societe)}</span><span>Cette commission est facturable car le dossier est installé.</span></div></div>}</Modal>
  </div>
}
