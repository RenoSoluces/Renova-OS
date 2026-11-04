import { useCallback, useEffect, useState } from 'react'
import { Phone, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface Rdv { evenement_id: string; prospect_id: string; titre: string; date: string; heure: string | null; type: string; adresse: string; nom: string; prenom: string; telephone: string | null; ville: string | null; commercial: string | null; derniere_statut: string | null; derniere_note: string | null }
interface Vente { devis_id: string; prospect_id: string; numero: string; signature_date: string; nom: string; prenom: string; telephone: string | null; ville: string | null; commercial: string | null; produits: string | null; derniere_statut: string | null; derniere_note: string | null }

const STATUTS: Record<string, string> = { confirme: 'Confirmé', a_rappeler: 'À rappeler', injoignable: 'Injoignable', annule: 'Annulé' }
const dateFr = (v: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

/** Espace du confirmateur : appelle les clients avant les rendez-vous et après la signature. Aucun prix ni commission n'est affiché. */
export function ConfirmationsPage() {
  const [rdv, setRdv] = useState<Rdv[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [onglet, setOnglet] = useState<'rdv' | 'ventes'>('rdv')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data, error } = await supabase.rpc('confirmations_a_faire')
    if (error) setMessage(`Chargement impossible : ${error.message}`)
    else { setRdv((data?.rdv || []) as Rdv[]); setVentes((data?.ventes || []) as Vente[]); setMessage('') }
    setChargement(false)
  }, [])
  useEffect(() => { void charger() }, [charger])

  async function enregistrer(type: 'rdv' | 'vente', cle: string, prospect: string, devis: string | null, evenement: string | null, statut: string) {
    const { error } = await supabase.rpc('enregistrer_confirmation', { p_type: type, p_prospect: prospect, p_devis: devis, p_evenement: evenement, p_statut: statut, p_note: notes[cle] || null })
    if (error) { setMessage(`Enregistrement impossible : ${error.message}`); return }
    setNotes(n => ({ ...n, [cle]: '' }))
    void charger()
  }

  const actions = (type: 'rdv' | 'vente', cle: string, prospect: string, devis: string | null, evenement: string | null) => (
    <div className="confirm-actions">
      <input className="input" placeholder="Note (facultative)" value={notes[cle] || ''} onChange={e => setNotes(n => ({ ...n, [cle]: e.target.value }))} aria-label="Note" />
      <Button variant="primary" size="sm" onClick={() => void enregistrer(type, cle, prospect, devis, evenement, 'confirme')}>Confirmé</Button>
      <Button variant="ghost" size="sm" onClick={() => void enregistrer(type, cle, prospect, devis, evenement, 'a_rappeler')}>À rappeler</Button>
      <Button variant="ghost" size="sm" onClick={() => void enregistrer(type, cle, prospect, devis, evenement, 'injoignable')}>Injoignable</Button>
      <Button variant="ghost" size="sm" onClick={() => void enregistrer(type, cle, prospect, devis, evenement, 'annule')}>Annulé</Button>
    </div>
  )
  const dernier = (s: string | null, n: string | null) => s ? <small className="confirm-dernier">Dernier appel : {STATUTS[s] || s}{n ? ` — ${n}` : ''}</small> : null
  const tel = (t: string | null) => t ? <a className="confirm-tel" href={`tel:${t}`}><Phone size={14} /> {t}</a> : <span className="text-muted">Pas de téléphone</span>
  const restants = (liste: { derniere_statut: string | null }[]) => liste.filter(x => x.derniere_statut !== 'confirme').length

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Confirmations</h1><p className="page-subtitle">Appelez le client la veille du rendez-vous, puis après la signature pour valider la vente.</p></div>
        <div className="page-actions"><Button variant="ghost" onClick={() => void charger()}><RefreshCw size={15} /> Actualiser</Button></div>
      </div>
      {message && <div className="card card-pad" role="alert" style={{ marginBottom: 12 }}>{message}</div>}
      <div className="vue-switch" role="tablist" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={onglet === 'rdv'} className={onglet === 'rdv' ? 'on' : ''} onClick={() => setOnglet('rdv')}>Rendez-vous ({restants(rdv)})</button>
        <button type="button" role="tab" aria-selected={onglet === 'ventes'} className={onglet === 'ventes' ? 'on' : ''} onClick={() => setOnglet('ventes')}>Ventes ({ventes.length})</button>
      </div>
      {chargement && <div className="card card-pad">Chargement…</div>}
      {!chargement && onglet === 'rdv' && (rdv.length === 0
        ? <div className="card card-pad"><b>Aucun rendez-vous à confirmer</b><p className="text-muted" style={{ marginBottom: 0 }}>Les rendez-vous et visites des 7 prochains jours apparaissent ici.</p></div>
        : <div className="confirm-liste">{rdv.map(r => (
          <div className="card card-pad" key={r.evenement_id}>
            <div className="confirm-tete"><b>{r.prenom} {r.nom}</b>{tel(r.telephone)}</div>
            <div className="text-sm">{dateFr(r.date)}{r.heure ? ` à ${r.heure}` : ''} · {r.type === 'visite' ? 'Visite technique' : 'Rendez-vous'} · {r.adresse || r.ville}</div>
            <div className="text-sm text-muted">{r.commercial ? `Avec ${r.commercial}` : 'Commercial non renseigné'}</div>
            {dernier(r.derniere_statut, r.derniere_note)}
            {actions('rdv', r.evenement_id, r.prospect_id, null, r.evenement_id)}
          </div>))}</div>)}
      {!chargement && onglet === 'ventes' && (ventes.length === 0
        ? <div className="card card-pad"><b>Aucune vente à valider</b><p className="text-muted" style={{ marginBottom: 0 }}>Les devis signés depuis moins de 3 semaines apparaissent ici jusqu'à leur confirmation.</p></div>
        : <div className="confirm-liste">{ventes.map(v => (
          <div className="card card-pad" key={v.devis_id}>
            <div className="confirm-tete"><b>{v.prenom} {v.nom}</b>{tel(v.telephone)}</div>
            <div className="text-sm">Devis {v.numero} signé le {dateFr(v.signature_date)} · {v.ville}</div>
            <div className="text-sm">{v.produits || 'Produits non renseignés'}</div>
            <div className="text-sm text-muted">{v.commercial ? `Vendu par ${v.commercial}` : ''}</div>
            {dernier(v.derniere_statut, v.derniere_note)}
            {actions('vente', v.devis_id, v.prospect_id, v.devis_id, null)}
          </div>))}</div>)}
    </div>
  )
}
