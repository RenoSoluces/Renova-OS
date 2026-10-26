import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardCheck, HardHat, Loader2, MapPin, Phone, Wrench, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { euro } from '../../lib/crm/constants'
import { BoutonRelance } from '../partage/BoutonRelance'
import { SignaturePad } from '../shared/SignaturePad'
import { genererPVReceptionPDF } from '../../lib/pdf/genererPVReceptionPDF'
import { uploadDocument } from '../../lib/storage/uploadDocument'
import { setProspectStatus } from '../../lib/crm/workflow'

interface DossierPose {
  id: string; reference: string | null; statut: string | null; montant_total: number | null; prospect_id: string | null; devis_id: string | null
  date_installation_prevue: string | null; date_installation: string | null; installateur_id: string | null; notes_installation: string | null
  duree_pose_jours: number | null; planning_event_id: string | null; reception: Record<string, any> | null
  prospect?: { id: string; prenom: string | null; nom: string | null; telephone: string | null; email: string | null; adresse: string | null; adresse_rue: string | null; code_postal: string | null; ville: string | null } | null
}
interface Installateur { id: string; nom: string; telephone?: string | null; actif?: boolean }

const lundi = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const adresse = (d: DossierPose) => [d.prospect?.adresse_rue || d.prospect?.adresse, d.prospect?.code_postal, d.prospect?.ville].filter(Boolean).join(' ')
const nomClient = (d: DossierPose) => `${d.prospect?.prenom || ''} ${d.prospect?.nom || ''}`.trim() || 'Client'

/** Planning des poses : dossiers à planifier, semaines de chantier, réception signée sur tablette. */
export function PlanningPoses() {
  const { profile } = useAuth()
  const [dossiers, setDossiers] = useState<DossierPose[]>([])
  const [installateurs, setInstallateurs] = useState<Installateur[]>([])
  const [chargement, setChargement] = useState(true)
  const [planifier, setPlanifier] = useState<DossierPose | null>(null)
  const [reception, setReception] = useState<DossierPose | null>(null)

  async function charger() {
    setChargement(true)
    const [d, i] = await Promise.all([
      supabase.from('dossiers').select('id,reference,statut,montant_total,prospect_id,devis_id,date_installation_prevue,date_installation,installateur_id,notes_installation,duree_pose_jours,planning_event_id,reception, prospect:prospects(id,prenom,nom,telephone,email,adresse,adresse_rue,code_postal,ville)')
        .in('statut', ['signe', 'installation', 'installe']).order('date_installation_prevue', { ascending: true, nullsFirst: true }),
      supabase.from('installateurs').select('id,nom,telephone,actif').order('nom'),
    ])
    setDossiers((d.data || []) as any)
    setInstallateurs((i.data || []) as any)
    setChargement(false)
  }
  useEffect(() => { void charger() }, [])

  const nomInstallateur = (id: string | null) => installateurs.find(i => i.id === id)?.nom || null
  const aPlanifier = dossiers.filter(d => d.statut !== 'installe' && !d.date_installation_prevue)
  const planifies = dossiers.filter(d => d.statut !== 'installe' && d.date_installation_prevue)
  const termines = dossiers.filter(d => d.statut === 'installe').slice(-12).reverse()
  const semaines = useMemo(() => {
    const groupes = new Map<string, DossierPose[]>()
    for (const d of planifies) {
      const cle = iso(lundi(new Date(`${d.date_installation_prevue}T12:00:00`)))
      groupes.set(cle, [...(groupes.get(cle) || []), d])
    }
    return [...groupes.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [planifies])
  const cetteSemaine = iso(lundi(new Date()))

  const carte = (d: DossierPose, mode: 'planifier' | 'planifie' | 'termine') => (
    <article key={d.id} className={`pp-carte ${mode}`}>
      <div className="pp-carte-tete">
        <div><strong>{nomClient(d)}</strong><small>{d.reference || '—'} · {euro(Number(d.montant_total) || 0)}</small></div>
        {mode === 'planifie' && d.date_installation_prevue && <span className="pp-date">{new Date(`${d.date_installation_prevue}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{(d.duree_pose_jours || 1) > 1 ? ` · ${d.duree_pose_jours} j` : ''}</span>}
        {mode === 'termine' && <span className={`pp-pv ${d.reception?.signe ? 'ok' : ''}`}>{d.reception?.signe ? (d.reception?.avec_reserves ? 'Réception avec réserves' : 'Réceptionné') : 'PV à faire'}</span>}
      </div>
      {adresse(d) && <div className="pp-ligne"><MapPin size={13} /> {adresse(d)}</div>}
      {d.installateur_id && <div className="pp-ligne"><HardHat size={13} /> {nomInstallateur(d.installateur_id)}</div>}
      {d.notes_installation && <div className="pp-note">{d.notes_installation}</div>}
      <div className="pp-actions">
        {mode !== 'termine' && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPlanifier(d)}><CalendarDays size={14} /> {mode === 'planifier' ? 'Planifier' : 'Modifier'}</button>}
        {mode === 'planifie' && <BoutonRelance prospect={d.prospect as any} contexte="installation" infos={{ date: d.date_installation_prevue, installateur: nomInstallateur(d.installateur_id), dureeJours: d.duree_pose_jours }} libelle="Prévenir le client" />}
        {mode !== 'planifier' && !d.reception?.signe && <button type="button" className="btn btn-sm btn-primary" onClick={() => setReception(d)}><ClipboardCheck size={14} /> PV de réception</button>}
        {d.prospect?.telephone && <a className="btn btn-sm btn-ghost" href={`tel:${d.prospect.telephone}`}><Phone size={14} /></a>}
      </div>
    </article>
  )

  if (chargement) return <div className="card card-pad text-muted">Chargement du planning…</div>

  return (
    <div className="pp">
      <section className="pp-colonne">
        <h3>À planifier <span>{aPlanifier.length}</span></h3>
        {aPlanifier.length === 0 ? <p className="pp-vide">Tous les dossiers signés ont une date de pose.</p> : aPlanifier.map(d => carte(d, 'planifier'))}
      </section>
      <section className="pp-colonne large">
        <h3>Poses planifiées <span>{planifies.length}</span></h3>
        {semaines.length === 0 && <p className="pp-vide">Aucune pose planifiée.</p>}
        {semaines.map(([semaine, liste]) => (
          <div key={semaine} className={`pp-semaine${semaine === cetteSemaine ? ' courante' : semaine < cetteSemaine ? ' passee' : ''}`}>
            <div className="pp-semaine-tete">{semaine === cetteSemaine ? 'Cette semaine' : `Semaine du ${new Date(`${semaine}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}{semaine < cetteSemaine && <em> · en retard</em>}</div>
            {liste.map(d => carte(d, 'planifie'))}
          </div>
        ))}
      </section>
      <section className="pp-colonne">
        <h3>Installés <span>{dossiers.filter(d => d.statut === 'installe').length}</span></h3>
        {termines.length === 0 ? <p className="pp-vide">Les chantiers réceptionnés apparaîtront ici.</p> : termines.map(d => carte(d, 'termine'))}
      </section>

      {planifier && <ModalePlanifier dossier={planifier} installateurs={installateurs.filter(i => i.actif !== false)} userId={profile?.id || null} onFermer={() => setPlanifier(null)} onFait={() => { setPlanifier(null); void charger() }} />}
      {reception && <ModaleReception dossier={reception} installateur={nomInstallateur(reception.installateur_id)} onFermer={() => setReception(null)} onFait={() => { setReception(null); void charger() }} />}
    </div>
  )
}

function ModalePlanifier({ dossier, installateurs, userId, onFermer, onFait }: { dossier: DossierPose; installateurs: Installateur[]; userId: string | null; onFermer: () => void; onFait: () => void }) {
  const [date, setDate] = useState(dossier.date_installation_prevue || '')
  const [duree, setDuree] = useState(dossier.duree_pose_jours || 1)
  const [installateur, setInstallateur] = useState(dossier.installateur_id || '')
  const [notes, setNotes] = useState(dossier.notes_installation || '')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    if (!date) { setErreur('Choisissez la date de pose.'); return }
    setOccupe(true); setErreur('')
    // Événement d'agenda (synchronisé avec les agendas abonnés) créé ou mis à jour.
    const titre = `Installation · ${nomClient(dossier)}`
    const evt = { titre, date, heure: '08:00', type: 'installation', adresse: adresse(dossier) || null, notes: [installateurs.find(i => i.id === installateur)?.nom, notes].filter(Boolean).join(' · ') || null, prospect_id: dossier.prospect_id, user_id: userId }
    let eventId = dossier.planning_event_id
    if (eventId) await supabase.from('planning_events').update(evt).eq('id', eventId)
    else { const { data } = await supabase.from('planning_events').insert(evt).select('id').single(); eventId = data?.id || null }
    const { error } = await supabase.from('dossiers').update({ date_installation_prevue: date, duree_pose_jours: duree, installateur_id: installateur || null, notes_installation: notes || null, statut: 'installation', planning_event_id: eventId }).eq('id', dossier.id)
    setOccupe(false)
    if (error) { setErreur(error.message); return }
    if (dossier.prospect_id) await setProspectStatus(dossier.prospect_id, 'Installation', 'pose planifiée')
    onFait()
  }

  return (
    <div className="pp-voile" role="dialog" aria-modal="true" aria-label="Planifier la pose">
      <div className="pp-feuille">
        <div className="pp-feuille-tete"><h2>Planifier la pose · {nomClient(dossier)}</h2><button type="button" onClick={onFermer} aria-label="Fermer"><X size={18} /></button></div>
        <div className="pp-grille">
          <label><span>Date de début</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label><span>Durée (jours)</span><input type="number" min={1} max={30} value={duree} onChange={e => setDuree(Math.max(1, Number(e.target.value) || 1))} /></label>
          <label className="large"><span>Installateur / équipe</span>
            <select value={installateur} onChange={e => setInstallateur(e.target.value)}><option value="">Équipe interne</option>{installateurs.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}</select>
          </label>
          <label className="large"><span>Consignes pour l’équipe</span><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Accès, matériel, contraintes (voir aussi le relevé de pose de la VT)…" /></label>
        </div>
        {erreur && <div className="pp-erreur">{erreur}</div>}
        <div className="pp-pied"><button type="button" className="btn btn-ghost" onClick={onFermer}>Annuler</button><button type="button" className="btn btn-primary" onClick={() => void enregistrer()} disabled={occupe}>{occupe ? <Loader2 size={15} className="spin" /> : <CalendarDays size={15} />} Enregistrer</button></div>
      </div>
    </div>
  )
}

function ModaleReception({ dossier, installateur, onFermer, onFait }: { dossier: DossierPose; installateur: string | null; onFermer: () => void; onFait: () => void }) {
  const { profile } = useAuth()
  const [date, setDate] = useState(iso(new Date()))
  const [avecReserves, setAvecReserves] = useState(false)
  const [reserves, setReserves] = useState('')
  const [delai, setDelai] = useState('30 jours')
  const [nomClientSign, setNomClientSign] = useState(nomClient(dossier))
  const [nomEntreprise, setNomEntreprise] = useState(profile?.nom_complet || '')
  const [sigClient, setSigClient] = useState<string | null>(null)
  const [sigEntreprise, setSigEntreprise] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')

  async function valider() {
    if (!sigClient || !sigEntreprise) { setErreur('Les deux signatures sont nécessaires.'); return }
    if (avecReserves && !reserves.trim()) { setErreur('Décrivez les réserves.'); return }
    setOccupe(true); setErreur('')
    try {
      const [{ data: lignes }, { data: entreprise }] = await Promise.all([
        dossier.devis_id ? supabase.from('devis_lignes').select('designation,produit_id').eq('devis_id', dossier.devis_id).order('ordre') : Promise.resolve({ data: [] as any[] }),
        supabase.from('entreprises').select('raison_sociale').limit(1).maybeSingle(),
      ])
      const doc = genererPVReceptionPDF({
        entreprise: entreprise?.raison_sociale || 'Entreprise', reference: dossier.reference || '', client: nomClient(dossier), adresse: adresse(dossier),
        travaux: (lignes || []).filter((l: any) => l.produit_id).map((l: any) => l.designation), dateReception: date, avecReserves, reserves, delaiLevee: delai,
        nomClient: nomClientSign, nomInstallateur: nomEntreprise, installateur: installateur || '', signatureClient: sigClient, signatureInstallateur: sigEntreprise,
      })
      const fichier = new File([doc.output('blob')], `PV-reception-${dossier.reference || dossier.id.slice(0, 8)}.pdf`, { type: 'application/pdf' })
      const { error: errPv, document: docPv } = await uploadDocument(fichier, { dossierId: dossier.id, prospectId: dossier.prospect_id, type: 'pv_reception', categorie: 'Contractuel' })
      if (errPv) throw new Error(errPv)
      for (const ph of photos) await uploadDocument(ph, { dossierId: dossier.id, prospectId: dossier.prospect_id, type: 'photos_apres', categorie: 'Technique' })
      const { error } = await supabase.from('dossiers').update({
        statut: 'installe', date_installation: date,
        reception: { signe: true, date, avec_reserves: avecReserves, reserves: avecReserves ? reserves : null, delai_levee: avecReserves ? delai : null, document_id: (docPv as any)?.id || null, photos: photos.length, signe_le: new Date().toISOString() },
      }).eq('id', dossier.id)
      if (error) throw error
      if (dossier.prospect_id) {
        await setProspectStatus(dossier.prospect_id, 'Installé', 'PV de réception signé')
        await supabase.from('interactions').insert({ prospect_id: dossier.prospect_id, type: 'note', auteur: profile?.nom_complet || null, contenu: `Réception des travaux signée le ${new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR')}${avecReserves ? ` avec réserves : ${reserves}` : ' sans réserve'}.` })
      }
      doc.save(fichier.name)
      onFait()
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Enregistrement impossible.') }
    setOccupe(false)
  }

  return (
    <div className="pp-voile" role="dialog" aria-modal="true" aria-label="Procès-verbal de réception">
      <div className="pp-feuille large">
        <div className="pp-feuille-tete"><h2><ClipboardCheck size={19} /> Réception des travaux · {nomClient(dossier)}</h2><button type="button" onClick={onFermer} aria-label="Fermer"><X size={18} /></button></div>
        <div className="pp-grille">
          <label><span>Date de réception</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <div className="pp-choix"><span>Réception</span><div>
            <button type="button" className={!avecReserves ? 'on' : ''} onClick={() => setAvecReserves(false)}><CheckCircle2 size={15} /> Sans réserve</button>
            <button type="button" className={avecReserves ? 'on reserve' : ''} onClick={() => setAvecReserves(true)}><Wrench size={15} /> Avec réserves</button>
          </div></div>
          {avecReserves && <>
            <label className="large"><span>Réserves constatées</span><textarea rows={3} value={reserves} onChange={e => setReserves(e.target.value)} placeholder="Ex. habillage de la liaison frigorifique à reprendre…" /></label>
            <label><span>Délai de levée</span><input value={delai} onChange={e => setDelai(e.target.value)} /></label>
          </>}
          <label className="large"><span>Photos de fin de chantier</span><input type="file" accept="image/*" capture="environment" multiple onChange={e => setPhotos(Array.from(e.target.files || []))} /><small>{photos.length ? `${photos.length} photo(s) jointe(s) au dossier` : 'Facultatif, recommandé pour le dossier d’aides'}</small></label>
        </div>
        <div className="pp-signatures">
          <div><label><span>Le client</span><input value={nomClientSign} onChange={e => setNomClientSign(e.target.value)} /></label><div className="pp-pad"><SignaturePad onChange={setSigClient} height={150} /></div></div>
          <div><label><span>L’entreprise</span><input value={nomEntreprise} onChange={e => setNomEntreprise(e.target.value)} /></label><div className="pp-pad"><SignaturePad onChange={setSigEntreprise} height={150} /></div></div>
        </div>
        <p className="pp-mention">La réception fait démarrer les garanties légales (parfait achèvement 1 an, bon fonctionnement 2 ans, décennale). Le PV signé est rangé dans le dossier.</p>
        {erreur && <div className="pp-erreur">{erreur}</div>}
        <div className="pp-pied"><button type="button" className="btn btn-ghost" onClick={onFermer}>Annuler</button><button type="button" className="btn btn-primary" onClick={() => void valider()} disabled={occupe}>{occupe ? <Loader2 size={15} className="spin" /> : <ClipboardCheck size={15} />} Valider la réception</button></div>
      </div>
    </div>
  )
}
