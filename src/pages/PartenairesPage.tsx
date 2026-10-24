import { useEffect, useMemo, useState } from 'react'
import { Building2, Mail, MapPin, Phone, Plus, Search, ShieldCheck, Wrench, Users, Pencil, Power } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatInput } from '../components/ui/FloatInput'
import { euro } from '../lib/crm/constants'
import { useAuth } from '../lib/auth/AuthContext'

export function PartenairesPage() {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewTarget, setReviewTarget] = useState<any | null>(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewForm, setReviewForm] = useState({ note_globale: '5', note_qualite: '5', note_delais: '5', note_communication: '5', note_sav: '5', commentaire: '', contexte: '' })
  const [partners,setPartners]=useState<any[]>([])
  const [prospects,setProspects]=useState<any[]>([])
  const [dossiers,setDossiers]=useState<any[]>([])
  const [devis,setDevis]=useState<any[]>([])
  const [search,setSearch]=useState('')
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<any|null>(null)
  const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({nom:'',contact:'',telephone:'',email:'',adresse:'',code_postal:'',ville:'',zone_intervention:'',numero_rge:'',specialites:'',siret:'',numero_tva:'',devis_autorise:false,devis_nom_affichage:'',devis_raison_sociale:'',devis_forme_juridique:'',devis_logo_url:'',devis_cgv:''})
  async function load(){
    const [p,pr,d,dv,rv]=await Promise.all([
      supabase.from('installateurs').select('*').order('nom'),
      supabase.from('prospects').select('id,installateur_id,statut'),
      supabase.from('dossiers').select('id,prospect_id,devis_id,installateur_id,statut,montant_total'),
      supabase.from('devis').select('id,montant_ttc'),
      supabase.from('installateur_evaluations').select('*').order('created_at', { ascending: false }),
    ])
    setPartners(p.data||[]);setProspects(pr.data||[]);setDossiers(d.data||[]);setDevis(dv.data||[]);setReviews(rv.data||[])
  }
  useEffect(()=>{load()},[])
  const devisMap=useMemo(()=>new Map(devis.map(x=>[x.id,Number(x.montant_ttc)||0])),[devis])
  const prospectPartner=useMemo(()=>new Map(prospects.map(x=>[x.id,x.installateur_id])),[prospects])
  const filtered=useMemo(()=>partners.filter(p=>`${p.nom} ${p.ville||''} ${p.specialites?.join(' ')||''}`.toLowerCase().includes(search.toLowerCase())),[partners,search])
  function openEdit(p:any){
    setEditing(p)
    setForm({nom:p.nom||'',contact:p.contact||'',telephone:p.telephone||'',email:p.email||'',adresse:p.adresse||'',code_postal:p.code_postal||'',ville:p.ville||'',zone_intervention:p.zone_intervention||'',numero_rge:p.numero_rge||'',specialites:(p.specialites||[]).join(', '),siret:p.siret||'',numero_tva:p.numero_tva||'',devis_autorise:!!p.devis_autorise,devis_nom_affichage:p.devis_nom_affichage||'',devis_raison_sociale:p.devis_raison_sociale||'',devis_forme_juridique:p.devis_forme_juridique||'',devis_logo_url:p.devis_logo_url||'',devis_cgv:p.devis_cgv||''})
    setOpen(true)
  }
  async function save(){
    if(!form.nom.trim())return
    setSaving(true)
    const payload={...form,specialites:form.specialites.split(',').map((x:string)=>x.trim()).filter(Boolean),siret:form.siret,numero_tva:form.numero_tva}
    const result=editing
      ? await supabase.from('installateurs').update(payload).eq('id',editing.id)
      : await supabase.from('installateurs').insert(payload)
    setSaving(false)
    if(result.error){alert(result.error.message);return}
    setOpen(false);setEditing(null);setForm({nom:'',contact:'',telephone:'',email:'',adresse:'',code_postal:'',ville:'',zone_intervention:'',numero_rge:'',specialites:'',siret:'',numero_tva:'',devis_autorise:false,devis_nom_affichage:'',devis_raison_sociale:'',devis_forme_juridique:'',devis_logo_url:'',devis_cgv:''});load()
  }
  async function saveReview(){
    if(!reviewTarget || !profile?.id || !reviewForm.commentaire.trim()) return
    setReviewSaving(true)
    const result = await supabase.from('installateur_evaluations').insert({ installateur_id: reviewTarget.id, auteur_id: profile.id, note_globale: Number(reviewForm.note_globale), note_qualite: Number(reviewForm.note_qualite), note_delais: Number(reviewForm.note_delais), note_communication: Number(reviewForm.note_communication), note_sav: Number(reviewForm.note_sav), commentaire: reviewForm.commentaire.trim(), contexte: reviewForm.contexte.trim() || null })
    setReviewSaving(false)
    if(result.error){alert('Impossible d’enregistrer l’évaluation : '+result.error.message);return}
    setReviewTarget(null)
    setReviewForm({ note_globale:'5', note_qualite:'5', note_delais:'5', note_communication:'5', note_sav:'5', commentaire:'', contexte:'' })
    await load()
  }
  async function toggleActif(p:any){
    const next=!p.actif
    const {error}=await supabase.from('installateurs').update({actif:next}).eq('id',p.id)
    if(error){alert(error.message);return}
    setPartners(prev=>prev.map(x=>x.id===p.id?{...x,actif:next}:x))
  }
  return <div className="page partners-page">
    <div className="page-header"><div><div className="dashboard-kicker">RÉSEAU ADMIN</div><h1 className="page-title">Partenaires</h1><p className="page-subtitle">Pilotage des installateurs, spécialités et zones d’intervention.</p></div><Button variant="primary" onClick={()=>{setEditing(null);setForm({nom:'',contact:'',telephone:'',email:'',adresse:'',code_postal:'',ville:'',zone_intervention:'',numero_rge:'',specialites:'',siret:'',numero_tva:'',devis_autorise:false,devis_nom_affichage:'',devis_raison_sociale:'',devis_forme_juridique:'',devis_logo_url:'',devis_cgv:''});setOpen(true)}}><Plus size={17}/> Nouveau partenaire</Button></div>
    <section className="dashboard-kpis partner-kpis">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Building2 size={19}/></span><span className="dashboard-kpi-main"><strong>{partners.filter(p=>p.actif).length}</strong><span>Partenaires actifs</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><Users size={19}/></span><span className="dashboard-kpi-main"><strong>{prospects.filter(p=>p.installateur_id).length}</strong><span>Leads attribués</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><Wrench size={19}/></span><span className="dashboard-kpi-main"><strong>{dossiers.filter(d=>d.installateur_id && d.statut!=='installe').length}</strong><span>Chantiers en cours</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><ShieldCheck size={19}/></span><span className="dashboard-kpi-main"><strong>{partners.filter(p=>p.numero_rge).length}</strong><span>RGE renseignés</span></span></div>
    </section>
    <div className="card partners-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un partenaire…"/></div></div>
    <div className="partners-grid">{filtered.map(p=>{const leads=prospects.filter(x=>x.installateur_id===p.id).length;const ds=dossiers.filter(x=>(prospectPartner.get(x.prospect_id)||x.installateur_id)===p.id);const chantiers=ds.length;const ca=ds.reduce((s,x)=>s+(Number(x.montant_total)||Number(devisMap.get(x.devis_id)||0)),0);return <article className="partner-card" key={p.id}><div className="partner-card-head"><div className="partner-avatar"><Building2 size={20}/></div><div><h3>{p.nom}</h3><span>{p.ville||'Ville non renseignée'}</span></div><span className={`badge ${p.actif?'badge-success':'badge-neutral'}`}>{p.actif?'Actif':'Inactif'}</span>{p.devis_autorise&&<span className="badge badge-info">Devis autorisés</span>}<div style={{marginLeft:'auto',display:'flex',gap:6}}><Button size="sm" variant="ghost" onClick={()=>openEdit(p)}><Pencil size={14}/></Button><Button size="sm" variant="ghost" onClick={()=>toggleActif(p)} title={p.actif?'Désactiver':'Réactiver'}><Power size={14}/></Button></div></div><div className="partner-meta">{p.contact&&<span><Users size={14}/>{p.contact}</span>}{p.telephone&&<span><Phone size={14}/>{p.telephone}</span>}{p.email&&<span><Mail size={14}/>{p.email}</span>}{p.zone_intervention&&<span><MapPin size={14}/>{p.zone_intervention}</span>}</div><div className="partner-specialties">{(p.specialites||[]).map((s:string)=><span key={s}>{s}</span>)}</div><div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',margin:'10px 0'}}><strong>Évaluations : {reviews.filter(r=>r.installateur_id===p.id).length ? (reviews.filter(r=>r.installateur_id===p.id).reduce((s,r)=>s+Number(r.note_globale||0),0)/reviews.filter(r=>r.installateur_id===p.id).length).toFixed(1)+' / 5' : 'Aucune note'}</strong><span className="text-muted text-sm">{reviews.filter(r=>r.installateur_id===p.id).length} avis</span><Button size="sm" variant="secondary" onClick={()=>setReviewTarget(p)}>Évaluer / commenter</Button></div>{reviews.filter(r=>r.installateur_id===p.id).slice(0,2).map(r=><div key={r.id} className="text-muted text-sm" style={{padding:'6px 0',borderTop:'1px solid var(--border)'}}><strong>{'★'.repeat(Number(r.note_globale||0))}{'☆'.repeat(5-Number(r.note_globale||0))}</strong> — {r.commentaire}</div>)}<div className="partner-stats"><div><strong>{leads}</strong><span>Leads</span></div><div><strong>{chantiers}</strong><span>Chantiers</span></div><div><strong>{euro(ca)}</strong><span>CA dossiers</span></div></div></article>})}</div>
        <Modal open={!!reviewTarget} onClose={()=>setReviewTarget(null)} title={reviewTarget ? "Évaluer " + reviewTarget.nom : "Évaluer un installateur"} footer={<><Button variant="ghost" onClick={()=>setReviewTarget(null)}>Annuler</Button><Button variant="primary" disabled={reviewSaving || !reviewForm.commentaire.trim()} onClick={saveReview}>{reviewSaving?"Enregistrement…":"Publier l’évaluation"}</Button></>}>
      <p className="text-muted">Les évaluations sont partagées pour aider les équipes à choisir un installateur. Restez factuel et décrivez votre expérience professionnelle.</p>
      <div className="grid grid-2 gap-3 mt-4">{([["note_globale","Note globale"],["note_qualite","Qualité du travail"],["note_delais","Respect des délais"],["note_communication","Communication"],["note_sav","SAV"]] as [keyof typeof reviewForm,string][]).map(([key,label])=><label className="field" key={key}><span>{label}</span><select value={reviewForm[key]} onChange={e=>setReviewForm({...reviewForm,[key]:e.target.value})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>)}</div>
      <label className="field mt-4"><span>Contexte (facultatif)</span><input value={reviewForm.contexte} onChange={e=>setReviewForm({...reviewForm,contexte:e.target.value})} placeholder="Ex. PAC air/eau, chantier de 2026"/></label>
      <label className="field mt-4"><span>Commentaire *</span><textarea rows={4} required value={reviewForm.commentaire} onChange={e=>setReviewForm({...reviewForm,commentaire:e.target.value})} placeholder="Qualité, ponctualité, communication, réserves constatées…"/></label>
    </Modal>
    <Modal open={open} onClose={()=>setOpen(false)} title={editing?"Modifier le partenaire":"Nouveau partenaire"} footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>Annuler</Button><Button variant="primary" disabled={saving} onClick={save}>{saving?'Enregistrement…':editing?'Enregistrer les modifications':'Créer le partenaire'}</Button></>}><FloatInput label="Entreprise" value={form.nom} onChange={v=>setForm({...form,nom:v})}/><div className="grid grid-2 gap-3 mt-4"><FloatInput label="Contact" value={form.contact} onChange={v=>setForm({...form,contact:v})}/><FloatInput label="Téléphone" value={form.telephone} onChange={v=>setForm({...form,telephone:v})}/><FloatInput label="Email" value={form.email} onChange={v=>setForm({...form,email:v})}/><FloatInput label="Ville" value={form.ville} onChange={v=>setForm({...form,ville:v})}/><FloatInput label="Zone d'intervention" value={form.zone_intervention} onChange={v=>setForm({...form,zone_intervention:v})}/><FloatInput label="N° RGE" value={form.numero_rge} onChange={v=>setForm({...form,numero_rge:v})}/></div><div className="grid grid-2 gap-3 mt-4"><FloatInput label="Adresse" value={form.adresse} onChange={v=>setForm({...form,adresse:v})}/><FloatInput label="Code postal" value={form.code_postal} onChange={v=>setForm({...form,code_postal:v})}/><FloatInput label="SIRET" value={form.siret} onChange={v=>setForm({...form,siret:v})}/><FloatInput label="TVA intracommunautaire" value={form.numero_tva} onChange={v=>setForm({...form,numero_tva:v})}/></div><div className="mt-4"><FloatInput label="Spécialités" value={form.specialites} onChange={v=>setForm({...form,specialites:v})} placeholder="PAC, VMC, photovoltaïque…"/></div>
<div className="card card-pad mt-4" style={{ background: 'var(--c-surface-2)' }}>
  <label className="checkbox-field">
    <input type="checkbox" checked={!!form.devis_autorise} onChange={e=>setForm({...form,devis_autorise:e.target.checked})}/>
    <span>Autoriser l’émission de devis depuis Renova OS</span>
  </label>
  {form.devis_autorise && <>
    <div className="grid grid-2 gap-3 mt-4">
      <FloatInput label="Nom affiché sur le devis" value={form.devis_nom_affichage} onChange={v=>setForm({...form,devis_nom_affichage:v})}/>
      <FloatInput label="Raison sociale" value={form.devis_raison_sociale} onChange={v=>setForm({...form,devis_raison_sociale:v})}/>
      <FloatInput label="Forme juridique" value={form.devis_forme_juridique} onChange={v=>setForm({...form,devis_forme_juridique:v})}/>
      <FloatInput label="Logo URL / chemin public" value={form.devis_logo_url} onChange={v=>setForm({...form,devis_logo_url:v})}/>
    </div>
    <label className="field mt-4">
      <span>CGV à afficher sur les devis de ce partenaire</span>
      <textarea rows={8} value={form.devis_cgv} onChange={e=>setForm({...form,devis_cgv:e.target.value})} placeholder="Collez ici les CGV validées par le partenaire."/>
    </label>
  </>}
</div></Modal>
  </div>
}
