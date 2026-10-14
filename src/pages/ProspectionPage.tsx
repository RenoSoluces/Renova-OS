import { useEffect, useRef, useState } from 'react'
import { Upload, Phone, Search, CalendarClock, CheckCircle2, ClipboardList, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { Prospect } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

type ProspectProspection = Prospect & { dernier_resultat?: string }
const normaliser = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[ _-]+/g,' ')
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/,1)[0] || ''
  const delimiter = (firstLine.match(/;/g)||[]).length > (firstLine.match(/,/g)||[]).length ? ';' : ','
  const rows: string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false
  for(let i=0;i<text.length;i++){
    const ch=text[i]
    if(ch==='"' && quoted && text[i+1]==='"'){cell+='"';i++;continue}
    if(ch==='"'){quoted=!quoted;continue}
    if(ch===delimiter&&!quoted){row.push(cell.trim());cell='';continue}
    if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x))rows.push(row);row=[];cell='';continue}
    cell+=ch
  }
  row.push(cell.trim());if(row.some(x=>x))rows.push(row)
  return rows
}

export function ProspectionPage(): JSX.Element {
  const { profile } = useAuth()
  const [prospects,setProspects] = useState<ProspectProspection[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [error,setError] = useState('')
  const [importing,setImporting] = useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  const [selected,setSelected]=useState<ProspectProspection|null>(null)
  const [resultForm,setResultForm]=useState({resultat:'À rappeler',note:'',date_rappel:'',priorite:'normale'})
  const [savingResult,setSavingResult]=useState(false)

  async function load():Promise<void>{
    setLoading(true)
    const {data,error}=await supabase.from('prospects').select('*').order('created_at',{ascending:false})
    if(error){setError(error.message);setProspects([]);setLoading(false);return}
    const rows=(data||[]) as Prospect[]
    const ids=rows.filter(p=>/prospection|porte.?a.?porte/i.test(p.source||'')).map(p=>p.id)
    const interactions=ids.length?await supabase.from('interactions').select('prospect_id,contenu,created_at').in('prospect_id',ids).order('created_at',{ascending:false}):{data:[],error:null}
    const latest=new Map<string,string>()
    for(const i of (interactions.data||[]) as any[]){if(!latest.has(i.prospect_id))latest.set(i.prospect_id,i.contenu)}
    setProspects(rows.filter(p=>/prospection|porte.?a.?porte/i.test(p.source||'')).map(p=>({...p,dernier_resultat:latest.get(p.id)})))
    setLoading(false)
  }
  useEffect(()=>{void load()},[])

  async function importerCsv(file?:File):Promise<void>{
    if(!file)return
    setImporting(true);setError('')
    try{
      const raw=parseCsv(await file.text())
      if(raw.length<2)throw new Error('Le fichier ne contient aucune ligne de prospect après les en-têtes.')
      const headers=raw[0].map(normaliser)
      const find=(row:string[],names:string[])=>{const index=headers.findIndex(h=>names.includes(h));return index>=0?(row[index]||'').trim():''}
      const parsed=raw.slice(1).map(row=>{
        const fullName=find(row,['nom complet','nom et prenom','contact','nom'])
        const prenom=find(row,['prenom','first name'])
        let nom=find(row,['nom de famille','lastname','surname'])
        let first=prenom
        if(!first&&fullName.includes(' ')){const bits=fullName.split(/\s+/);first=bits.shift()||'';if(!nom)nom=bits.join(' ')}
        if(!nom)nom=fullName
        const raison=find(row,['raison sociale','entreprise','societe','company'])
        return {nom,prenom:first,telephone:find(row,['telephone','tel','mobile','phone']),email:find(row,['email','e mail','courriel']),adresse:find(row,['adresse','rue']),code_postal:find(row,['code postal','cp','postal code']),ville:find(row,['ville','commune','city']),raison_sociale:raison,source:find(row,['source','origine'])||'Prospection fichier'}
      }).filter(r=>r.nom||r.raison_sociale)
      if(!parsed.length)throw new Error('Aucun prospect exploitable. Vérifiez les colonnes nom/prénom ou raison sociale.')
      const {data:existing}=await supabase.from('prospects').select('telephone,email')
      const phones=new Set((existing||[]).map((x:any)=>String(x.telephone||'').replace(/\D/g,'' )).filter(Boolean))
      const emails=new Set((existing||[]).map((x:any)=>String(x.email||'').trim().toLowerCase()).filter(Boolean))
      const payload=parsed.filter(r=>{const phone=r.telephone.replace(/\D/g,'');const email=r.email.toLowerCase();if((phone&&phones.has(phone))||(email&&emails.has(email)))return false;if(phone)phones.add(phone);if(email)emails.add(email);return true}).map(r=>({
        type_prospect:r.raison_sociale?'professionnel':'particulier',raison_sociale:r.raison_sociale||null,nom:r.nom||r.raison_sociale,prenom:r.prenom||'',telephone:r.telephone||null,email:r.email||null,
        adresse:r.adresse||null,adresse_rue:r.adresse||null,code_postal:r.code_postal||null,ville:r.ville||null,source:/porte a porte/i.test(normaliser(r.source))?'Porte-à-porte':'Prospection fichier',statut:'Nouveau',
        statut_occupation:'propriétaire_occupant',nombre_personnes_foyer:1,zone_ile_de_france:false,fiches_cee:[],commercial:profile?.nom_complet||null,commercial_id:profile?.id||null,
      }))
      if(!payload.length)throw new Error('Tous les contacts du fichier semblent déjà présents (téléphone ou e-mail identique).')
      const {data:createdProspects,error:insertError}=await supabase.from('prospects').insert(payload).select('id')
      if(insertError)throw new Error(insertError.message)
      const ids=(createdProspects||[]).map((x:any)=>x.id)
      const {error:mailError,data:mailResult}=ids.length?await supabase.functions.invoke('notify-new-prospect',{body:{prospectIds:ids}}):{error:null,data:null}
      setError(`${ids.length} prospect(s) importé(s). Les doublons ont été ignorés.${mailError||mailResult?.error?' L’e-mail de notification n’a pas pu être envoyé : vérifiez la configuration Resend.':''}`)
      await load()
    }catch(e:any){setError(e?.message||'Import CSV impossible.')}
    finally{setImporting(false);if(fileRef.current)fileRef.current.value=''}
  }

  async function enregistrerResultat():Promise<void>{
    if(!selected)return
    setSavingResult(true);setError('')
    const content=[`Résultat prospection : ${resultForm.resultat}`,resultForm.note.trim()].filter(Boolean).join(' — ')
    const {error:interactionError}=await supabase.from('interactions').insert({prospect_id:selected.id,type:'appel',contenu:content,auteur:profile?.nom_complet||profile?.email||null,meta:{canal:'prospection',resultat:resultForm.resultat}})
    if(interactionError){setError(`Impossible d’enregistrer le résultat : ${interactionError.message}`);setSavingResult(false);return}
    if(resultForm.date_rappel){
      const {error:taskError}=await supabase.from('tasks').insert({prospect_id:selected.id,titre:`Rappel prospection — ${selected.prenom} ${selected.nom}`,description:resultForm.note.trim()||resultForm.resultat,type:'relance',priorite:resultForm.priorite,assigne:profile?.nom_complet||'',due_at:new Date(`${resultForm.date_rappel}T09:00:00`).toISOString(),done:false})
      if(taskError)setError(`Résultat enregistré, mais rappel non créé : ${taskError.message}`)
    }
    setSavingResult(false);setSelected(null);await load()
  }

  const visible=prospects.filter(p=>`${p.prenom} ${p.nom} ${p.telephone} ${p.email} ${p.ville}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">Prospection</h1><p className="page-subtitle">Importez vos fichiers de leads, appelez rapidement et conservez l’historique des résultats et rappels porte-à-porte.</p></div><div className="page-actions"><input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={e=>void importerCsv(e.target.files?.[0])}/><Button variant="primary" onClick={()=>fileRef.current?.click()} disabled={importing}><Upload size={16}/>{importing?'Import…':'Importer un fichier CSV'}</Button></div></div>
    {error&&<div className="card card-pad" style={{marginBottom:14,color:error.includes('importé')?'#166534':'#b91c1c'}}>{error}</div>}
    <div className="card card-pad" style={{marginBottom:14}}><div className="text-sm text-muted" style={{marginBottom:8}}>Colonnes reconnues automatiquement : nom, prénom, téléphone, e-mail, adresse, code postal, ville, raison sociale, source. Les contacts déjà présents (téléphone/e-mail) sont ignorés.</div><div style={{position:'relative'}}><Search size={16} style={{position:'absolute',left:10,top:12}}/><input className="input" style={{paddingLeft:34}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un nom, un numéro ou une ville…"/></div></div>
    <div className="card">
      {loading?<div className="card-pad text-muted">Chargement des leads…</div>:visible.length===0?<div className="empty-state"><UserRound size={36}/><h3>Aucun lead de prospection</h3><p>Importez un CSV pour constituer votre liste d’appels.</p></div>:<div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Contact</th><th>Téléphone</th><th>Localisation</th><th>Source</th><th>Dernier résultat</th><th>Action</th></tr></thead><tbody>{visible.map(p=><tr key={p.id}><td><strong>{p.prenom} {p.nom}</strong><div className="text-xs text-muted">{p.email||'—'}</div></td><td><strong>{p.telephone||'—'}</strong></td><td>{[p.code_postal,p.ville].filter(Boolean).join(' ')||'—'}</td><td>{p.source}</td><td className="text-sm text-muted">{p.dernier_resultat||'Aucun appel enregistré'}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{p.telephone&&<a className="btn btn-sm btn-secondary" href={`tel:${p.telephone}`}><Phone size={13}/> Appeler</a>}<Button size="sm" variant="primary" onClick={()=>{setSelected(p);setResultForm({resultat:'À rappeler',note:'',date_rappel:'',priorite:'normale'})}}><ClipboardList size={13}/> Résultat</Button></div></td></tr>)}</tbody></table></div>}
    </div>
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?`Résultat de prospection — ${selected.prenom} ${selected.nom}`:'Résultat de prospection'} width={600} footer={<><Button variant="secondary" onClick={()=>setSelected(null)}>Annuler</Button><Button variant="primary" onClick={()=>void enregistrerResultat()} disabled={savingResult}>{savingResult?'Enregistrement…':'Enregistrer le résultat'}</Button></>}>
      {selected&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div className="card card-pad"><strong>{selected.telephone||'Téléphone manquant'}</strong><div className="text-sm text-muted">{[selected.adresse,selected.code_postal,selected.ville].filter(Boolean).join(', ')}</div></div>
        <label className="field"><span>Résultat</span><select className="input" value={resultForm.resultat} onChange={e=>setResultForm(f=>({...f,resultat:e.target.value}))}><option>À rappeler</option><option>Intéressé</option><option>Rendez-vous demandé</option><option>Injoignable</option><option>Pas intéressé</option><option>Adresse visitée — absent</option><option>Adresse visitée — contact établi</option></select></label>
        <label className="field"><span>Compte rendu</span><textarea className="input" rows={3} value={resultForm.note} onChange={e=>setResultForm(f=>({...f,note:e.target.value}))} placeholder="Échange, besoin, objections, prochaines étapes…"/></label>
        <label className="field"><span>Date de rappel (facultative)</span><input className="input" type="datetime-local" value={resultForm.date_rappel} onChange={e=>setResultForm(f=>({...f,date_rappel:e.target.value}))}/></label>
        {resultForm.date_rappel&&<label className="field"><span>Priorité du rappel</span><select className="input" value={resultForm.priorite} onChange={e=>setResultForm(f=>({...f,priorite:e.target.value}))}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></select></label>}
        <p className="text-xs text-muted">Le résultat est enregistré dans l’historique du prospect. Si une date de rappel est définie, une tâche apparaîtra dans « À traiter ».</p>
      </div>}
    </Modal>
  </div>
}
