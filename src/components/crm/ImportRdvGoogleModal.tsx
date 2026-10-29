import { useEffect, useMemo, useState } from 'react'
import { Loader2, CalendarSearch, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { lireTout } from '../../lib/lireTout'
import { useAuth } from '../../lib/auth/AuthContext'
import { analyserRdv, type CandidatProspect, type ProspectExistant, type RdvGoogle } from '../../lib/crm/importGoogleAgenda'

const PERIODES = [{ jours: 90, label: '3 mois' }, { jours: 180, label: '6 mois' }, { jours: 365, label: '12 mois' }, { jours: 730, label: '24 mois' }]
type Filtre = 'proposes' | 'tous' | 'doublons'

/** Import de prospects à partir des rendez-vous passés de Google Agenda. */
export function ImportRdvGoogleModal({ onClose, onImporte }: { onClose: () => void; onImporte: (n: number) => void }) {
  const { profile } = useAuth()
  const [jours, setJours] = useState(365)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [candidats, setCandidats] = useState<CandidatProspect[]>([])
  const [filtre, setFiltre] = useState<Filtre>('proposes')
  const [import_, setImport] = useState<{ fait: number; total: number } | null>(null)

  useEffect(() => {
    let annule = false
    void (async () => {
      setChargement(true); setErreur('')
      const [{ data, error }, existants] = await Promise.all([
        supabase.functions.invoke('google-agenda', { body: { action: 'lister_rdv', jours } }),
        lireTout(() => supabase.from('prospects').select('id,nom,prenom,telephone,email,code_postal')),
      ])
      if (annule) return
      if (error || !data?.rdv) {
        const contexte = (error as { context?: Response } | null)?.context
        const detail = contexte && typeof contexte.json === 'function' ? await contexte.json().catch(() => null) : null
        setErreur(detail?.erreur || detail?.error || 'Lecture de Google Agenda impossible.')
        setChargement(false)
        return
      }
      const liste = (existants.data || []) as ProspectExistant[]
      setCandidats((data.rdv as RdvGoogle[]).map(r => analyserRdv(r, liste)))
      setChargement(false)
    })()
    return () => { annule = true }
  }, [jours])

  const visibles = useMemo(() => candidats.filter(c =>
    filtre === 'tous' ? true : filtre === 'doublons' ? !!c.doublon : !c.doublon && !c.probablementPerso), [candidats, filtre])
  const selectionnes = candidats.filter(c => c.selection)

  const maj = (rdvId: string, champ: keyof CandidatProspect, valeur: string | boolean) =>
    setCandidats(prev => prev.map(c => c.rdvId === rdvId ? { ...c, [champ]: valeur } : c))
  const toutCocher = (valeur: boolean) => {
    const ids = new Set(visibles.map(c => c.rdvId))
    setCandidats(prev => prev.map(c => ids.has(c.rdvId) && (c.nom || !valeur) ? { ...c, selection: valeur } : c))
  }

  async function importer() {
    const aImporter = selectionnes.filter(c => c.nom.trim())
    if (!aImporter.length) return
    setImport({ fait: 0, total: aImporter.length }); setErreur('')
    let fait = 0
    for (const c of aImporter) {
      const dateRdv = new Date(`${c.date}T${c.heure || '09:00'}:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const { data, error } = await supabase.from('prospects').insert({
        type_prospect: 'particulier', raison_sociale: null, civilite: c.civilite || 'M.', prenom: c.prenom.trim(), nom: c.nom.trim(),
        telephone: c.telephone.trim() || null, email: c.email.trim() || null,
        adresse: c.adresse || null, adresse_rue: c.adresse || null, code_postal: c.codePostal || null, ville: c.ville || null,
        source: 'Google Agenda', statut: 'Qualifié', statut_occupation: 'propriétaire_occupant', nombre_personnes_foyer: 1,
        zone_ile_de_france: false, fiches_cee: [], commentaires: c.notes || null,
        commercial: profile?.nom_complet || null, commercial_id: profile?.id || null,
      }).select('id').single()
      if (error || !data) { setErreur(`« ${c.prenom} ${c.nom} » : ${error?.message || 'création impossible'}. Import arrêté.`); break }
      await supabase.from('interactions').insert({
        prospect_id: data.id, type: 'visite', auteur: profile?.nom_complet || null,
        contenu: `Rendez-vous du ${dateRdv}${c.heure ? ` à ${c.heure}` : ''} (importé de Google Agenda) : ${c.titreOrigine}${c.notes ? `\n${c.notes}` : ''}`.slice(0, 4000),
        meta: { canal: 'google_agenda', google_event_id: c.rdvId, date_rdv: c.date },
      })
      fait++
      setImport({ fait, total: aImporter.length })
      setCandidats(prev => prev.map(x => x.rdvId === c.rdvId ? { ...x, selection: false, doublon: `${c.prenom} ${c.nom}`.trim() } : x))
    }
    setImport(null)
    if (fait) onImporte(fait)
  }

  const compte = (f: Filtre) => candidats.filter(c => f === 'tous' ? true : f === 'doublons' ? !!c.doublon : !c.doublon && !c.probablementPerso).length

  return (
    <Modal open onClose={onClose} title="Importer mes RDV Google en prospects" width={1100}
      footer={<>
        <span className="import-g-total">{selectionnes.length} prospect{selectionnes.length > 1 ? 's' : ''} sélectionné{selectionnes.length > 1 ? 's' : ''}</span>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
        <button type="button" className="btn btn-primary" disabled={!selectionnes.length || !!import_} onClick={() => void importer()}>
          {import_ ? <><Loader2 size={16} className="spin" /> {import_.fait}/{import_.total}</> : `Importer ${selectionnes.length || ''}`}
        </button>
      </>}>
      <div className="import-g">
        <div className="import-g-barre">
          <label>Période
            <select value={jours} onChange={e => setJours(Number(e.target.value))} disabled={chargement}>
              {PERIODES.map(p => <option key={p.jours} value={p.jours}>{p.label}</option>)}
            </select>
          </label>
          <div className="import-g-filtres" role="tablist">
            {([['proposes', 'Proposés'], ['doublons', 'Déjà dans le CRM'], ['tous', 'Tous les RDV']] as [Filtre, string][]).map(([f, l]) =>
              <button key={f} type="button" className={filtre === f ? 'on' : ''} onClick={() => setFiltre(f)}>{l} <b>{compte(f)}</b></button>)}
          </div>
          <div className="import-g-cocher">
            <button type="button" onClick={() => toutCocher(true)}>Tout cocher</button> · <button type="button" onClick={() => toutCocher(false)}>Tout décocher</button>
          </div>
        </div>
        <p className="import-g-aide">Vérifiez et corrigez chaque ligne avant d’importer : le nom vient du titre du RDV, l’adresse du lieu, le téléphone et l’e-mail de la description. Les prospects sont créés à votre nom, au statut « Qualifié », avec le RDV dans leur historique.</p>
        {erreur && <div className="login-error"><AlertTriangle size={14} /> {erreur}</div>}
        {chargement ? <div className="import-g-vide"><Loader2 size={20} className="spin" /> Lecture de votre Google Agenda…</div>
          : visibles.length === 0 ? <div className="import-g-vide"><CalendarSearch size={22} /> Aucun rendez-vous dans cette catégorie.</div>
          : <div className="import-g-table">
            <table>
              <thead><tr><th></th><th>RDV</th><th>Civ.</th><th>Prénom</th><th>Nom</th><th>Téléphone</th><th>E-mail</th><th>Adresse</th><th>CP</th><th>Ville</th></tr></thead>
              <tbody>{visibles.map(c => (
                <tr key={c.rdvId} className={c.selection ? 'on' : ''}>
                  <td><input type="checkbox" checked={c.selection} disabled={!c.nom.trim()} onChange={e => maj(c.rdvId, 'selection', e.target.checked)} aria-label="Importer" /></td>
                  <td className="import-g-rdv">
                    <b>{new Date(`${c.date}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}{c.heure ? ` ${c.heure}` : ''}</b>
                    <span title={c.titreOrigine}>{c.titreOrigine || '(sans titre)'}</span>
                    {c.doublon && <em className="doublon"><CheckCircle2 size={11} /> Déjà : {c.doublon}</em>}
                    {!c.doublon && c.probablementPerso && <em>Semble personnel</em>}
                  </td>
                  <td><select value={c.civilite} onChange={e => maj(c.rdvId, 'civilite', e.target.value)}><option value="">—</option><option>M.</option><option>Mme</option><option>M. et Mme</option></select></td>
                  <td className="import-g-prenom"><input value={c.prenom} onChange={e => maj(c.rdvId, 'prenom', e.target.value)} />
                    <button type="button" title="Inverser prénom et nom" aria-label="Inverser prénom et nom" onClick={() => setCandidats(prev => prev.map(x => x.rdvId === c.rdvId ? { ...x, prenom: x.nom, nom: x.prenom } : x))}>⇄</button></td>
                  <td><input value={c.nom} onChange={e => maj(c.rdvId, 'nom', e.target.value)} className={!c.nom.trim() ? 'manquant' : ''} placeholder="Requis" /></td>
                  <td><input value={c.telephone} onChange={e => maj(c.rdvId, 'telephone', e.target.value)} /></td>
                  <td><input value={c.email} onChange={e => maj(c.rdvId, 'email', e.target.value)} /></td>
                  <td><input value={c.adresse} onChange={e => maj(c.rdvId, 'adresse', e.target.value)} /></td>
                  <td><input value={c.codePostal} onChange={e => maj(c.rdvId, 'codePostal', e.target.value)} className="cp" /></td>
                  <td><input value={c.ville} onChange={e => maj(c.rdvId, 'ville', e.target.value)} /></td>
                </tr>))}
              </tbody>
            </table>
          </div>}
      </div>
    </Modal>
  )
}
