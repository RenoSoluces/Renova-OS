import { useEffect, useMemo, useState } from 'react'
import { Building2, Mail, MapPin, Phone, Plus, Search, ShieldCheck, Wrench, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatInput } from '../components/ui/FloatInput'
import { euro } from '../lib/crm/constants'

export function PartenairesPage() {
  const [partners,setPartners]=useState<any[]>([])
  const [prospects,setProspects]=useState<any[]>([])
  const [dossiers,setDossiers]=useState<any[]>([])
  const [search,setSearch]=useState('')
  const [open,setOpen]=useState(false)
  const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({nom:'',contact:'',telephone:'',email:'',adresse:'',code_postal:'',ville:'',zone_intervention:'',numero_rge:'',specialites:''})
  async function load(){
    const [p,pr,d]=await Promise.all([
      supabase.from('installateurs').select('*').order('nom'),
      supabase.from('prospects').select('id,installateur_id,statut'),
      supabase.from('dossiers').select('id,installateur_id,statut,montant_total'),
    ])
    setPartners(p.data||[]);setProspects(pr.data||[]);setDossiers(d.data||[])
  }
  useEffect(()=>{load()},[])
  const filtered=useMemo(()=>partners.filter(p=>`${p.nom} ${p.ville||''} ${p.specialites?.join(' ')||''}`.toLowerCase().includes(search.toLowerCase())),[partners,search])
  async function add(){
    if(!form.nom.trim())return
    setSaving(true)
    const {error}=await supabase.from('installateurs').insert({...form,specialites:form.specialites.split(',').map((x:string)=>x.trim()).filter(Boolean)})
    setSaving(false)
    if(error){alert(error.message);return}
    setOpen(false);setForm({nom:'',contact:'',telephone:'',email:'',adresse:'',code_postal:'',ville:'',zone_intervention:'',numero_rge:'',specialites:''});load()
  }
  return <div className="page partners-page">
    <div className="page-header"><div><div className="dashboard-kicker">RÉSEAU ADMIN</div><h1 className="page-title">Partenaires</h1><p className="page-subtitle">Pilotage des installateurs, spécialités et zones d’intervention.</p></div><Button variant="primary" onClick={()=>setOpen(true)}><Plus size={17}/> Nouveau partenaire</Button></div>
    <section className="dashboard-kpis partner-kpis">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Building2 size={19}/></span><span className="dashboard-kpi-main"><strong>{partners.filter(p=>p.actif).length}</strong><span>Partenaires actifs</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><Users size={19}/></span><span className="dashboard-kpi-main"><strong>{prospects.filter(p=>p.installateur_id).length}</strong><span>Leads attribués</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><Wrench size={19}/></span><span className="dashboard-kpi-main"><strong>{dossiers.filter(d=>d.installateur_id && d.statut!=='installe').length}</strong><span>Chantiers en cours</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><ShieldCheck size={19}/></span><span className="dashboard-kpi-main"><strong>{partners.filter(p=>p.numero_rge).length}</strong><span>RGE renseignés</span></span></div>
    </section>
    <div className="card partners-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un partenaire…"/></div></div>
    <div className="partners-grid">{filtered.map(p=>{const leads=prospects.filter(x=>x.installateur_id===p.id).length;const chantiers=dossiers.filter(x=>x.installateur_id===p.id).length;const ca=dossiers.filter(x=>x.installateur_id===p.id).reduce((s,x)=>s+Number(x.montant_total||0),0);return <article className="partner-card" key={p.id}><div className="partner-card-head"><div className="partner-avatar"><Building2 size={20}/></div><div><h3>{p.nom}</h3><span>{p.ville||'Ville non renseignée'}</span></div><span className={`badge ${p.actif?'badge-success':'badge-neutral'}`}>{p.actif?'Actif':'Inactif'}</span></div><div className="partner-meta">{p.contact&&<span><Users size={14}/>{p.contact}</span>}{p.telephone&&<span><Phone size={14}/>{p.telephone}</span>}{p.email&&<span><Mail size={14}/>{p.email}</span>}{p.zone_intervention&&<span><MapPin size={14}/>{p.zone_intervention}</span>}</div><div className="partner-specialties">{(p.specialites||[]).map((s:string)=><span key={s}>{s}</span>)}</div><div className="partner-stats"><div><strong>{leads}</strong><span>Leads</span></div><div><strong>{chantiers}</strong><span>Chantiers</span></div><div><strong>{euro(ca)}</strong><span>CA dossiers</span></div></div></article>})}</div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Nouveau partenaire" footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>Annuler</Button><Button variant="primary" disabled={saving} onClick={add}>{saving?'Enregistrement…':'Créer le partenaire'}</Button></>}><FloatInput label="Entreprise" value={form.nom} onChange={v=>setForm({...form,nom:v})}/><div className="grid grid-2 gap-3 mt-4"><FloatInput label="Contact" value={form.contact} onChange={v=>setForm({...form,contact:v})}/><FloatInput label="Téléphone" value={form.telephone} onChange={v=>setForm({...form,telephone:v})}/><FloatInput label="Email" value={form.email} onChange={v=>setForm({...form,email:v})}/><FloatInput label="Ville" value={form.ville} onChange={v=>setForm({...form,ville:v})}/><FloatInput label="Zone d'intervention" value={form.zone_intervention} onChange={v=>setForm({...form,zone_intervention:v})}/><FloatInput label="N° RGE" value={form.numero_rge} onChange={v=>setForm({...form,numero_rge:v})}/></div><div className="mt-4"><FloatInput label="Spécialités" value={form.specialites} onChange={v=>setForm({...form,specialites:v})} placeholder="PAC, VMC, photovoltaïque…"/></div></Modal>
  </div>
}
