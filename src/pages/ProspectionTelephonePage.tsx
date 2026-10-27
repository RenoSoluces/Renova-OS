import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Upload, Phone, PhoneOff, PhoneCall, Search, CheckCircle2, CalendarCheck, UserRound, Download, FileSpreadsheet,
  Voicemail, ArrowRight, Clock, Inbox, ListPlus, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import { lirePages } from '../lib/catalogue/chargerCatalogue'
import type { Prospect } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { AjoutListeAppels } from '../components/prospection/AjoutListeAppels'

/** Issue d'un appel : « joint » = on a parlé à quelqu'un ; « pas_joint » = pas de conversation. */
type Issue = 'joint' | 'pas_joint'
type StatutLead = 'a_appeler' | Issue

const RESULTATS: { valeur: string; issue: Issue; icone: typeof Phone }[] = [
  { valeur: 'Intéressé', issue: 'joint', icone: CheckCircle2 },
  { valeur: 'Rendez-vous demandé', issue: 'joint', icone: CalendarCheck },
  { valeur: 'À rappeler', issue: 'joint', icone: Clock },
  { valeur: 'Pas intéressé', issue: 'joint', icone: PhoneOff },
  { valeur: 'Pas de réponse', issue: 'pas_joint', icone: PhoneOff },
  { valeur: 'Répondeur laissé', issue: 'pas_joint', icone: Voicemail },
  { valeur: 'Injoignable', issue: 'pas_joint', icone: PhoneOff },
  { valeur: 'Faux numéro', issue: 'pas_joint', icone: PhoneOff },
]
// Résultats déjà enregistrés par l'ancienne page (visite à domicile) : on les rattache à une issue.
const ISSUE_PAR_RESULTAT: Record<string, Issue> = {
  ...Object.fromEntries(RESULTATS.map(r => [r.valeur, r.issue])),
  'Adresse visitée — absent': 'pas_joint',
  'Adresse visitée — contact établi': 'joint',
}

interface Lead extends Prospect {
  statutLead: StatutLead
  dernierResultat: string | null
  dernierAppel: string | null
  tentatives: number
}

const normaliser = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[ _-]+/g, ' ')

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


const SOURCE_PROSPECTION = /prospection|porte.?a.?porte/i
const MODELE_CSV = 'nom;prenom;telephone;email;adresse;code_postal;ville;raison_sociale;source\r\nDupont;Marie;0601020304;marie.dupont@exemple.fr;12 rue des Lilas;69003;Lyon;;Prospection fichier\r\n'

function telechargerCsv(nom: string, contenu: string) {
  const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url; lien.download = nom; lien.click()
  URL.revokeObjectURL(url)
}
const celluleCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const telPropre = (t: string | null | undefined) => (t || '').replace(/[^\d+]/g, '')
const dateCourte = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''

export function ProspectionTelephonePage(): JSX.Element {
  const { profile } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'tous' | StatutLead | 'rdv'>('tous')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [resultForm, setResultForm] = useState({ resultat: '', note: '', date_rappel: '', priorite: 'normale' })
  const [savingResult, setSavingResult] = useState(false)
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const peutConstituer = ['admin', 'manager', 'commercial_manager', 'partner_admin', 'company_admin'].includes(profile?.role || '')
  const dejaListes = useMemo(() => new Set(leads.map(l => l.id)), [leads])

  // Noms des personnes chargées des appels, pour que les responsables sachent dans quelle liste est chaque prospect.
  const [appelants, setAppelants] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!peutConstituer) return
    void supabase.from('profiles').select('id,nom_complet').then(({ data }) =>
      setAppelants(Object.fromEntries(((data || []) as { id: string; nom_complet: string }[]).map(p => [p.id, p.nom_complet]))))
  }, [peutConstituer])

  async function retirerDeLaListe(lead: Lead): Promise<void> {
    const { error: e } = await supabase.rpc('retirer_liste_appels', { p_id: lead.id })
    if (e) { setError(`Impossible de retirer ce prospect : ${e.message}`); return }
    setLeads(ls => ls.filter(l => l.id !== lead.id))
  }

  // Rechargement discret : la liste reste affichée (et la position conservée) pendant la mise à jour.
  async function load(): Promise<void> {
    // Lecture paginée : un fichier de leads dépasse vite les 1 000 lignes servies par défaut.
    const { data, error } = await lirePages<Prospect>((debut, fin) =>
      supabase.from('prospects').select('*').order('created_at', { ascending: false }).order('id').range(debut, fin) as any)
    if (error) { setError(error.message); setLeads([]); setLoading(false); return }
    // Les portes saisies sur le terrain sans numéro de téléphone n'ont pas leur place dans une liste d'appels.
    // Prospects envoyés depuis le CRM : dans la liste de la personne qui les appelle ; les responsables voient toutes les listes.
    const rows = data.filter(p => (p.liste_appels_le && (p.liste_appels_pour === profile?.id || peutConstituer))
      || (SOURCE_PROSPECTION.test(p.source || '') && (p.telephone || !/porte/i.test(p.source || ''))))

    // Historique des appels de prospection, par paquets (une liste d'identifiants trop longue casse l'URL de la requête).
    const parProspect = new Map<string, { resultat: string; date: string; n: number }>()
    for (let i = 0; i < rows.length; i += 100) {
      const ids = rows.slice(i, i + 100).map(p => p.id)
      const { data: interactions } = await supabase.from('interactions')
        .select('prospect_id,contenu,created_at,meta').eq('type', 'appel').in('prospect_id', ids).order('created_at', { ascending: false })
      for (const it of (interactions || []) as any[]) {
        if (it.meta?.canal !== 'prospection') continue
        const actuel = parProspect.get(it.prospect_id)
        if (actuel) actuel.n += 1
        else parProspect.set(it.prospect_id, { resultat: it.meta?.resultat || String(it.contenu || '').replace(/^Résultat prospection : /, '').split(' — ')[0], date: it.created_at, n: 1 })
      }
    }
    setLeads(rows.map(p => {
      const h = parProspect.get(p.id)
      const issue = h ? ISSUE_PAR_RESULTAT[h.resultat] ?? 'pas_joint' : null
      return { ...p, statutLead: issue ?? 'a_appeler', dernierResultat: h?.resultat ?? null, dernierAppel: h?.date ?? null, tentatives: h?.n ?? 0 }
    }))
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

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

  function ouvrir(lead: Lead) {
    setSelected(lead)
    setResultForm({ resultat: '', note: '', date_rappel: '', priorite: 'normale' })
  }

  async function enregistrerResultat(suivant = false): Promise<void> {
    if (!selected) return
    if (!resultForm.resultat) { setError('Choisissez le résultat de l’appel.'); return }
    setSavingResult(true); setError('')
    const content = [`Résultat prospection : ${resultForm.resultat}`, resultForm.note.trim()].filter(Boolean).join(' — ')
    const { error: interactionError } = await supabase.from('interactions').insert({
      prospect_id: selected.id, type: 'appel', contenu: content, auteur: profile?.nom_complet || profile?.email || null,
      meta: { canal: 'prospection', resultat: resultForm.resultat, issue: ISSUE_PAR_RESULTAT[resultForm.resultat] },
    })
    if (interactionError) { setError(`Impossible d’enregistrer le résultat : ${interactionError.message}`); setSavingResult(false); return }
    if (resultForm.date_rappel) {
      const { error: taskError } = await supabase.from('tasks').insert({
        prospect_id: selected.id, titre: `Rappel prospection — ${selected.prenom} ${selected.nom}`,
        description: resultForm.note.trim() || resultForm.resultat, type: 'relance', priorite: resultForm.priorite,
        assigne: profile?.nom_complet || '', due_at: new Date(resultForm.date_rappel).toISOString(), done: false,
      })
      if (taskError) setError(`Résultat enregistré, mais rappel non créé : ${taskError.message}`)
    }
    const courant = selected.id
    setSavingResult(false); setSelected(null)
    await load()
    if (suivant) setProchain(courant)
  }

  // « Appeler le suivant » : prochain lead jamais appelé (le plus ancien d'abord), hors lead qu'on vient de traiter.
  const [prochainDemande, setProchainDemande] = useState<string | null>(null)
  function setProchain(sauf: string | null) { setProchainDemande(sauf ?? '') }
  const filePrioritaire = useMemo(() => leads.filter(l => l.statutLead === 'a_appeler' && l.telephone).slice().reverse(), [leads])
  useEffect(() => {
    if (prochainDemande === null) return
    const suivant = filePrioritaire.find(l => l.id !== prochainDemande)
    setProchainDemande(null)
    if (suivant) ouvrir(suivant)
  }, [prochainDemande, filePrioritaire])

  const stats = useMemo(() => {
    const appeles = leads.filter(l => l.statutLead !== 'a_appeler').length
    const joints = leads.filter(l => l.statutLead === 'joint').length
    return {
      total: leads.length, aAppeler: leads.length - appeles, joints,
      pasJoints: leads.filter(l => l.statutLead === 'pas_joint').length,
      rdv: leads.filter(l => l.dernierResultat === 'Rendez-vous demandé').length,
      tauxContact: appeles ? Math.round((joints / appeles) * 100) : null,
    }
  }, [leads])

  const visibles = leads.filter(l => {
    if (filtre === 'rdv' ? l.dernierResultat !== 'Rendez-vous demandé' : filtre !== 'tous' && l.statutLead !== filtre) return false
    return `${l.prenom} ${l.nom} ${l.raison_sociale || ''} ${l.telephone} ${l.email} ${l.ville}`.toLowerCase().includes(search.toLowerCase())
  })

  function exporter() {
    const entetes = ['nom', 'prenom', 'telephone', 'email', 'adresse', 'code_postal', 'ville', 'raison_sociale', 'statut', 'dernier_resultat', 'dernier_appel', 'tentatives']
    const libelle: Record<StatutLead, string> = { a_appeler: 'À appeler', joint: 'Joint', pas_joint: 'Pas joint' }
    const lignes = visibles.map(l => [l.nom, l.prenom, l.telephone, l.email, l.adresse, l.code_postal, l.ville, l.raison_sociale, libelle[l.statutLead], l.dernierResultat, l.dernierAppel ? new Date(l.dernierAppel).toLocaleString('fr-FR') : '', l.tentatives].map(celluleCsv).join(';'))
    telechargerCsv(`leads-telephone-${new Date().toISOString().slice(0, 10)}.csv`, [entetes.join(';'), ...lignes].join('\r\n'))
  }

  const FILTRES: { cle: typeof filtre; label: string; n: number; icone: typeof Phone; ton: string }[] = [
    { cle: 'tous', label: 'Tous les leads', n: stats.total, icone: Inbox, ton: 'neutre' },
    { cle: 'a_appeler', label: 'À appeler', n: stats.aAppeler, icone: Phone, ton: 'info' },
    { cle: 'joint', label: 'Joints', n: stats.joints, icone: CheckCircle2, ton: 'ok' },
    { cle: 'pas_joint', label: 'Pas joints', n: stats.pasJoints, icone: PhoneOff, ton: 'alerte' },
    { cle: 'rdv', label: 'RDV demandés', n: stats.rdv, icone: CalendarCheck, ton: 'ok' },
  ]

  return <div className="page pt">
    <div className="page-header">
      <div><h1 className="page-title">Prospection Téléphone</h1><p className="page-subtitle">Importez vos fichiers de leads ou ajoutez des prospects du CRM, appelez-les à la chaîne et notez pour chacun si vous l’avez eu ou non.</p></div>
      <div className="page-actions">
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={e => void importerCsv(e.target.files?.[0])} />
        <Button variant="secondary" onClick={() => telechargerCsv('modele-leads.csv', MODELE_CSV)}><FileSpreadsheet size={16} /> Modèle CSV</Button>
        <Button variant="secondary" onClick={exporter} disabled={visibles.length === 0}><Download size={16} /> Exporter</Button>
        {peutConstituer && <Button variant="secondary" onClick={() => setAjoutOuvert(true)}><ListPlus size={16} /> Envoyer des prospects du CRM</Button>}
        <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={importing}><Upload size={16} />{importing ? 'Import…' : 'Importer un fichier CSV'}</Button>
      </div>
    </div>
    {error && <div className={`pt-message ${/importé|ajouté/.test(error) ? 'ok' : 'erreur'}`} role="status">{error}</div>}

    <div className="pt-stats">
      {FILTRES.map(f => { const Icone = f.icone; return (
        <button key={f.cle} type="button" className={`pt-stat ${f.ton} ${filtre === f.cle ? 'on' : ''}`} onClick={() => setFiltre(f.cle)} aria-pressed={filtre === f.cle}>
          <span className="pt-stat-icone"><Icone size={17} /></span><strong>{f.n}</strong><small>{f.label}</small>
        </button>) })}
      <div className="pt-stat taux"><strong>{stats.tauxContact != null ? `${stats.tauxContact} %` : '—'}</strong><small>Taux de contact</small></div>
    </div>

    <div className="pt-barre">
      <div className="pt-recherche"><Search size={16} /><input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un nom, un numéro, une ville…" /></div>
      <Button variant="primary" size="lg" onClick={() => setProchain(null)} disabled={filePrioritaire.length === 0}><PhoneCall size={18} /> Appeler le suivant{filePrioritaire.length ? ` (${filePrioritaire.length})` : ''}</Button>
    </div>
    <p className="pt-aide">Colonnes reconnues à l’import : nom, prénom, téléphone, e-mail, adresse, code postal, ville, raison sociale, source. Les contacts déjà présents (téléphone ou e-mail) sont ignorés.</p>

    <div className="pt-liste">
      {loading ? <div className="card card-pad text-muted">Chargement des leads…</div>
        : visibles.length === 0 ? <div className="empty-state"><UserRound size={36} /><h3>{leads.length ? 'Aucun lead dans ce filtre' : 'Aucun lead de prospection'}</h3><p>{leads.length ? 'Changez de filtre ou de recherche.' : 'Importez un fichier CSV ou ajoutez des prospects du CRM pour constituer votre liste d’appels.'}</p></div>
        : visibles.map(l => (
          <article key={l.id} className={`pt-lead ${l.statutLead}`}>
            <div className="pt-lead-id">
              <strong>{l.raison_sociale || `${l.prenom} ${l.nom}`.trim()}</strong>
              <span>{[l.code_postal, l.ville].filter(Boolean).join(' ') || 'Localisation inconnue'}{l.liste_appels_le ? ` · Commercial : ${l.commercial || '—'}${peutConstituer && l.liste_appels_pour && l.liste_appels_pour !== profile?.id ? ` · Liste de ${appelants[l.liste_appels_pour] || '…'}` : ''}` : ''}</span>
            </div>
            <div className="pt-lead-tel">{l.telephone ? <a href={`tel:${telPropre(l.telephone)}`}>{l.telephone}</a> : <em>Téléphone manquant</em>}</div>
            <div className="pt-lead-statut">
              <span className={`pt-badge ${l.statutLead}`}>{l.statutLead === 'a_appeler' ? 'À appeler' : l.statutLead === 'joint' ? 'Joint' : 'Pas joint'}</span>
              {l.dernierResultat && <small>{l.dernierResultat} · {dateCourte(l.dernierAppel)}{l.tentatives > 1 ? ` · ${l.tentatives} appels` : ''}</small>}
            </div>
            <div className="pt-lead-actions">
              {l.telephone && <a className="btn btn-secondary btn-sm" href={`tel:${telPropre(l.telephone)}`}><Phone size={14} /> Appeler</a>}
              <Button variant={l.statutLead === 'a_appeler' ? 'primary' : 'secondary'} size="sm" onClick={() => ouvrir(l)}>Résultat <ArrowRight size={14} /></Button>
              {l.liste_appels_le && <button type="button" className="pt-retirer" onClick={() => void retirerDeLaListe(l)} title="Retirer de la liste d’appels (la fiche et son commercial ne changent pas)" aria-label={`Retirer ${l.prenom} ${l.nom} de la liste d’appels`}><X size={15} /></button>}
            </div>
          </article>))}
    </div>

    {peutConstituer && <AjoutListeAppels open={ajoutOuvert} onClose={() => setAjoutOuvert(false)} exclus={dejaListes}
      onAjoute={(n, nom) => { setAjoutOuvert(false); setError(`${n} prospect${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} à la liste d’appels${nom ? ` de ${nom}` : ''}. Le commercial attribué ne change pas.`); void load() }} />}

    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Appel — ${selected.raison_sociale || `${selected.prenom} ${selected.nom}`}` : 'Appel'} width={620}
      footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Annuler</Button><Button variant="secondary" onClick={() => void enregistrerResultat(false)} disabled={savingResult}>Enregistrer</Button><Button variant="primary" onClick={() => void enregistrerResultat(true)} disabled={savingResult}>{savingResult ? 'Enregistrement…' : 'Enregistrer et suivant'}</Button></>}>
      {selected && <div className="pt-modal">
        <div className="pt-modal-contact">
          {selected.telephone ? <a className="pt-gros-tel" href={`tel:${telPropre(selected.telephone)}`}><Phone size={20} /> {selected.telephone}</a> : <strong>Téléphone manquant</strong>}
          <span>{[selected.adresse, selected.code_postal, selected.ville].filter(Boolean).join(', ')}</span>
          {selected.tentatives > 0 && <small>{selected.tentatives} appel(s) déjà passé(s) · dernier : {selected.dernierResultat}</small>}
        </div>
        {(['joint', 'pas_joint'] as Issue[]).map(issue => (
          <div key={issue}>
            <div className="pt-groupe">{issue === 'joint' ? 'Nous l’avons eu' : 'Nous ne l’avons pas eu'}</div>
            <div className="pt-resultats">
              {RESULTATS.filter(r => r.issue === issue).map(r => { const Icone = r.icone; return (
                <button key={r.valeur} type="button" className={`pt-resultat ${issue} ${resultForm.resultat === r.valeur ? 'on' : ''}`} onClick={() => setResultForm(f => ({ ...f, resultat: r.valeur }))}><Icone size={16} />{r.valeur}</button>) })}
            </div>
          </div>))}
        <label className="field"><span>Compte rendu</span><textarea className="input" rows={2} value={resultForm.note} onChange={e => setResultForm(f => ({ ...f, note: e.target.value }))} placeholder="Échange, besoin, objections, prochaines étapes…" /></label>
        <label className="field"><span>Date de rappel (facultative)</span><input className="input" type="datetime-local" value={resultForm.date_rappel} onChange={e => setResultForm(f => ({ ...f, date_rappel: e.target.value }))} /></label>
        {resultForm.date_rappel && <label className="field"><span>Priorité du rappel</span><select className="input" value={resultForm.priorite} onChange={e => setResultForm(f => ({ ...f, priorite: e.target.value }))}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></select></label>}
        <p className="pt-aide">Le résultat est enregistré dans l’historique du prospect. Avec une date de rappel, une tâche apparaît dans « À traiter ».</p>
      </div>}
    </Modal>
  </div>
}
