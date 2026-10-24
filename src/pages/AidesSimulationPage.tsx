import { useEffect, useMemo, useState } from 'react'
import { Calculator, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { chargerCatalogue } from '../lib/catalogue/chargerCatalogue'
import { useAuth } from '../lib/auth/AuthContext'
import type { Entreprise, Produit, Prospect } from '../types'
import { Button } from '../components/ui/Button'
import { determinerProfilMPR, calculAideMPR, LABEL_PROFIL } from '../lib/aides/baremeMaPrimeRenov'
import { estimerPrimeCEE } from '../lib/aides/calculAidesCEE'
import { CATEGORIE_VERS_GESTE_MPR, CATEGORIE_VERS_GESTE_CEE } from '../lib/devis/calculDevis'

const euro=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0)
type SavedEstimate={id:string;prospect_id:string;produit_id:string|null;geste_id:string;montant_travaux_ht:number;quantite:number;profil_mpr:string|null;montant_mpr:number;montant_cee:number;taux_cee:number;avertissement:string;created_at:string;prospect?:Prospect|null;produit?:Produit|null}

export function AidesSimulationPage({initialProspectId,onInitialProspectHandled}:{initialProspectId?:string|null;onInitialProspectHandled?:()=>void}):JSX.Element{
  const {profile}=useAuth()
  const [prospects,setProspects]=useState<Prospect[]>([])
  const [produits,setProduits]=useState<Produit[]>([])
  const [entreprise,setEntreprise]=useState<Entreprise|null>(null)
  const [history,setHistory]=useState<SavedEstimate[]>([])
  const [prospectId,setProspectId]=useState('')
  const [produitId,setProduitId]=useState('')
  const [montantHt,setMontantHt]=useState('')
  const [quantite,setQuantite]=useState('1')
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const isAdmin=profile?.role==='admin'||profile?.role==='manager'
  async function load(){
    setLoading(true)
    const [p,prod,e,h]=await Promise.all([
      supabase.from('prospects').select('*').order('nom'),
      chargerCatalogue({ actifSeulement: true, tri: [{ colonne: 'nom' }] }),
      supabase.from('entreprises').select('*').limit(1).maybeSingle(),
      supabase.from('simulations_aides').select('*').order('created_at',{ascending:false}).limit(50),
    ])
    setProspects((p.data||[]) as Prospect[]);setProduits((prod.data||[]) as Produit[]);setEntreprise((e.data||null) as Entreprise|null)
    const prospectRows=(p.data||[]) as Prospect[];const productRows=(prod.data||[]) as Produit[]
    setHistory(((h.data||[]) as any[]).map(row=>({...row,prospect:prospectRows.find(x=>x.id===row.prospect_id)||null,produit:productRows.find(x=>x.id===row.produit_id)||null})))
    if(h.error)setError(`Historique indisponible : ${h.error.message}`)
    setLoading(false)
  }
  useEffect(()=>{void load()},[])
  useEffect(()=>{if(initialProspectId){setProspectId(initialProspectId);onInitialProspectHandled?.()}},[initialProspectId,onInitialProspectHandled])
  const prospect=prospects.find(p=>p.id===prospectId)
  const publicCible=prospect?.type_prospect==='professionnel'?'professionnel':'particulier'
  const produitsEligibles=produits.filter(p=>p.catalogue_groupe!=='visite_technique'&&(p.catalogue_groupe===publicCible||(!p.catalogue_groupe&&(p.public_cible===publicCible||p.public_cible==='tous')))&&(p.public_cible===publicCible||p.public_cible==='tous'))
  useEffect(()=>{if(produitId&&!produitsEligibles.some(p=>p.id===produitId))setProduitId('')},[prospectId,produitId,produitsEligibles])
  const produit=produitsEligibles.find(p=>p.id===produitId)
  const montant=Number(montantHt)||0;const qte=Math.max(1,Number(quantite)||1)
  const profilMpr=prospect?.rfr&&prospect.nombre_personnes_foyer?determinerProfilMPR(Number(prospect.rfr),Number(prospect.nombre_personnes_foyer),!!prospect.zone_ile_de_france):null
  const gesteMpr=produit?CATEGORIE_VERS_GESTE_MPR[produit.categorie]:null
  const resultatMpr=profilMpr&&gesteMpr&&montant>0?calculAideMPR(gesteMpr as any,profilMpr,montant,qte):null
  const gesteCee=produit?CATEGORIE_VERS_GESTE_CEE[produit.categorie]:null
  const tauxCee=Number(entreprise?.taux_cee_eur_par_mwh_cumac||6)
  const resultatCee=gesteCee?estimerPrimeCEE(gesteCee,qte,tauxCee):null
  const totalAides=(resultatMpr?.montant||0)+(resultatCee?.montantEstime||0)
  const reste=Math.max(0,montant-totalAides)
  const avertissements=[!prospect?.rfr?'RFR absent : le profil MaPrimeRénov’ ne peut pas être déterminé.':'',!gesteMpr?'Produit sans correspondance MaPrimeRénov’ automatique dans le barème actuel.':'',resultatCee?.avertissement||'Les CEE sont indicatifs et doivent être confirmés avec la fiche officielle et le taux contractuel du délégataire.'].filter(Boolean)

  async function enregistrer(){
    if(!prospect){setError('Sélectionnez un prospect.');return}
    if(!produit){setError('Sélectionnez un produit du catalogue.');return}
    if(montant<=0){setError('Indiquez un montant de travaux HT supérieur à zéro.');return}
    setSaving(true);setError('')
    const {data,error}=await supabase.from('simulations_aides').insert({prospect_id:prospect.id,produit_id:produit.id,geste_id:produit.categorie,montant_travaux_ht:montant,quantite:qte,profil_mpr:profilMpr,montant_mpr:resultatMpr?.montant||0,montant_cee:resultatCee?.montantEstime||0,taux_cee:tauxCee,avertissement:avertissements.join(' '),created_by:profile?.id||null }).select('*').single()
    setSaving(false)
    if(error){setError(`Enregistrement impossible : ${error.message}`);return}
    setHistory(prev=>[{...(data as any),prospect,produit},...prev])
  }

  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">Simulation des aides</h1><p className="page-subtitle">Estimation indicative de MaPrimeRénov’ et des CEE pour chaque prospect, à partir du catalogue.</p></div></div>
    {error&&<div className="card card-pad" style={{marginBottom:14,color:'#b91c1c'}}>{error}</div>}
    <div style={{display:'grid',gridTemplateColumns:'minmax(320px,1fr) minmax(280px,.85fr)',gap:16,alignItems:'start'}}>
      <div className="card card-pad" style={{display:'flex',flexDirection:'column',gap:14}}>
        <div className="section-label">Paramètres de simulation</div>
        <label className="field"><span>Prospect</span><select className="input" value={prospectId} onChange={e=>{setProspectId(e.target.value);setProduitId('')}}><option value="">Sélectionner un prospect</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.ville||''}</option>)}</select></label>
        {prospect&&<div className="card card-pad text-sm"><strong>{prospect.type_prospect==='professionnel'?(prospect.raison_sociale||`${prospect.prenom} ${prospect.nom}`):`${prospect.prenom} ${prospect.nom}`}</strong><div className="text-muted">{prospect.rfr?`RFR ${euro(Number(prospect.rfr))} · ${prospect.nombre_personnes_foyer} personne(s)`:'RFR non renseigné'}{profilMpr?` · Profil ${LABEL_PROFIL[profilMpr]}`:''}</div></div>}
        <label className="field"><span>Produit / geste</span><select className="input" value={produitId} onChange={e=>setProduitId(e.target.value)} disabled={!prospectId}><option value="">Sélectionner un produit</option>{produitsEligibles.map(p=><option key={p.id} value={p.id}>{p.nom} — {p.categorie}</option>)}</select></label>
        <div className="grid grid-2"><label className="field"><span>Montant travaux HT (€)</span><input className="input" type="number" min="0" step="0.01" value={montantHt} onChange={e=>setMontantHt(e.target.value)} /></label><label className="field"><span>Quantité (m² ou unité)</span><input className="input" type="number" min="1" step="1" value={quantite} onChange={e=>setQuantite(e.target.value)} /></label></div>
        {isAdmin&&<div className="text-sm text-muted">Taux CEE configuré pour l’entreprise : {tauxCee} €/MWh cumac. Modifiable dans Paramètres → Entreprise.</div>}
        <Button variant="primary" onClick={()=>void enregistrer()} disabled={saving||!prospectId||!produitId||montant<=0}><Save size={15}/>{saving?'Enregistrement…':'Enregistrer la simulation'}</Button>
      </div>
      <div className="card card-pad" style={{display:'flex',flexDirection:'column',gap:12}}>
        <div className="section-label">Résultat estimatif</div>
        {!prospect||!produit||montant<=0?<div className="empty-state"><Calculator size={32}/><h3>Complétez la simulation</h3><p>Sélectionnez un prospect, un produit et un montant de travaux.</p></div>:<>
          <div><div className="text-sm text-muted">MaPrimeRénov’ estimée</div><div style={{fontSize:25,fontWeight:700}}>{resultatMpr?euro(resultatMpr.montant):'—'}</div><div className="text-xs text-muted">{profilMpr?`Profil ${LABEL_PROFIL[profilMpr]}`:'RFR nécessaire pour déterminer le profil'}</div></div>
          <div><div className="text-sm text-muted">Prime CEE estimée</div><div style={{fontSize:25,fontWeight:700}}>{resultatCee?euro(resultatCee.montantEstime):'—'}</div><div className="text-xs text-muted">{resultatCee?.coefficient?.ficheReference||'Fiche CEE à déterminer'}</div></div>
          <div style={{borderTop:'1px solid var(--c-border)',paddingTop:12}}><div className="text-sm text-muted">Total des aides estimées</div><div style={{fontSize:28,fontWeight:800,color:'var(--c-primary)'}}>{euro(totalAides)}</div><div className="text-sm text-muted">Reste estimé après aides : {euro(reste)}</div></div>
          {avertissements.length>0&&<div className="text-xs text-muted" style={{display:'flex',gap:7,alignItems:'flex-start'}}><AlertTriangle size={15} style={{flexShrink:0}}/><span>{avertissements.join(' ')}</span></div>}
        </>}
      </div>
    </div>
    <div className="card" style={{marginTop:18}}><div className="card-header"><div className="card-title">Simulations enregistrées</div><span className="badge badge-neutral">{history.length}</span></div>{loading?<div className="card-pad text-muted">Chargement…</div>:history.length===0?<div className="card-pad text-sm text-muted">Aucune simulation d’aides enregistrée.</div>:<div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Date</th><th>Prospect</th><th>Produit</th><th>Travaux HT</th><th>MPR estimée</th><th>CEE estimées</th><th>Total estimé</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td>{new Date(h.created_at).toLocaleDateString('fr-FR')}</td><td>{h.prospect?`${h.prospect.prenom} ${h.prospect.nom}`:'—'}</td><td>{h.produit?.nom||h.geste_id}</td><td>{euro(Number(h.montant_travaux_ht))}</td><td>{euro(Number(h.montant_mpr))}</td><td>{euro(Number(h.montant_cee))}</td><td><strong>{euro(Number(h.montant_mpr)+Number(h.montant_cee))}</strong></td></tr>)}</tbody></table></div>}</div>
  </div>
}
