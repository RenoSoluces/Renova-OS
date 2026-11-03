import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { FloatSelect } from '../ui/FloatInput'
import {
  LIBELLES_PHASE, detecterColonnes, lignesDepuisTableau, rapprocher, type ColonnesExport, type DossierRapprochable, type PhaseMpr,
} from '../../lib/mpr/suiviAnah'

interface Props {
  open: boolean
  onClose: () => void
  dossiers: DossierRapprochable[]
  /** Appelé après application : recharger la liste des dossiers. */
  onApplique: () => void
}

const MAX_LIGNES = 2000

/** Met à jour l'avancement des dossiers d'après l'export Excel du tableau de bord mandataire de l'Anah. */
export function ImportExportAnah({ open, onClose, dossiers, onApplique }: Props) {
  const { profile } = useAuth()
  const [entetes, setEntetes] = useState<string[]>([])
  const [donnees, setDonnees] = useState<unknown[][]>([])
  const [colonnes, setColonnes] = useState<ColonnesExport>({})
  const [phase, setPhase] = useState<PhaseMpr>('subvention')
  const [nomFichier, setNomFichier] = useState('')
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState('')
  const [applique, setApplique] = useState(false)

  const lignes = useMemo(() => lignesDepuisTableau(donnees, colonnes), [donnees, colonnes])
  const rapprochement = useMemo(() => rapprocher(lignes, dossiers, phase), [lignes, dossiers, phase])
  const aMettreAJour = rapprochement.correspondances.filter(c => c.changement && c.statut)
  const statutsInconnus = rapprochement.correspondances.filter(c => !c.statut)

  function reinitialiser() { setEntetes([]); setDonnees([]); setColonnes({}); setNomFichier(''); setErreur(''); setResultat('') }

  async function lireFichier(fichier: File) {
    reinitialiser(); setNomFichier(fichier.name)
    try {
      const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array' })
      const feuille = classeur.Sheets[classeur.SheetNames[0]]
      const tableau = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, blankrows: false, defval: '' })
      // En-tête : première ligne avec au moins 3 cellules renseignées.
      const iEntete = tableau.findIndex(l => l.filter(c => String(c).trim() !== '').length >= 3)
      if (iEntete === -1 || tableau.length - iEntete - 1 < 1) { setErreur('Ce fichier ne contient pas de tableau exploitable.'); return }
      const corps = tableau.slice(iEntete + 1)
      if (corps.length > MAX_LIGNES) { setErreur(`Ce fichier dépasse ${MAX_LIGNES} lignes : exportez un onglet à la fois.`); return }
      const noms = tableau[iEntete].map(c => String(c).trim())
      setEntetes(noms); setDonnees(corps); setColonnes(detecterColonnes(noms))
    } catch {
      setErreur('Lecture impossible : utilisez l\'export Excel (.xlsx) ou CSV du tableau de bord mandataire.')
    }
  }

  async function appliquer() {
    setApplique(true); setErreur('')
    let ok = 0, echecs = 0
    for (const c of aMettreAJour) {
      const s = c.statut!
      const maintenant = new Date().toISOString()
      const champs: Record<string, unknown> = { mpr_phase: s.phase, mpr_statut: s.statut, mpr_statut_maj_le: maintenant }
      if (!c.dossier.mpr_numero_dossier && c.ligne.numero) champs.mpr_numero_dossier = c.ligne.numero
      const { error } = await supabase.from('dossiers').update(champs).eq('id', c.dossier.id)
      if (error) { echecs++; continue }
      await supabase.from('mpr_historique').insert({ dossier_id: c.dossier.id, phase: s.phase, statut: s.statut, source: 'import', note: nomFichier || null, cree_par: profile?.id || null })
      ok++
    }
    setApplique(false)
    setResultat(`${ok} dossier${ok > 1 ? 's' : ''} mis à jour${echecs ? `, ${echecs} en échec` : ''}.`)
    onApplique()
  }

  const choixColonne = (cle: keyof ColonnesExport, label: string) => (
    <FloatSelect label={label} value={colonnes[cle] != null ? String(colonnes[cle]) : ''} onChange={v => setColonnes(c => ({ ...c, [cle]: v === '' ? undefined : Number(v) }))}
      options={[{ value: '', label: '—' }, ...entetes.map((e, i) => ({ value: String(i), label: e || `Colonne ${i + 1}` }))]} />
  )

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reinitialiser() }}
      title="Mettre à jour depuis l'export de l'Anah"
      width={760}
      footer={<>
        <Button variant="ghost" onClick={() => { onClose(); reinitialiser() }}>Fermer</Button>
        <Button variant="primary" onClick={() => void appliquer()} disabled={applique || aMettreAJour.length === 0 || !!resultat}>
          {applique ? 'Mise à jour…' : `Mettre à jour ${aMettreAJour.length} dossier${aMettreAJour.length > 1 ? 's' : ''}`}
        </Button>
      </>}
    >
      <p className="text-sm text-muted" style={{ marginTop: 0 }}>
        Dans votre espace mandataire de l'Anah, exportez la liste d'un onglet au format Excel, puis déposez le fichier ici. Rien n'est modifié avant votre validation.
      </p>
      <label className="import-anah-depot">
        <Upload size={18} /> {nomFichier || 'Choisir le fichier Excel ou CSV'}
        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) void lireFichier(f) }} />
      </label>
      {erreur && <div className="mpr-alerte" role="alert">{erreur}</div>}

      {entetes.length > 0 && (
        <>
          <div className="grid grid-3 gap-3" style={{ marginTop: 14 }}>
            <FloatSelect label="Onglet exporté" value={phase} onChange={v => setPhase(v as PhaseMpr)}
              options={(Object.keys(LIBELLES_PHASE) as PhaseMpr[]).map(p => ({ value: p, label: LIBELLES_PHASE[p] }))} />
            {choixColonne('statut', 'Colonne de l\'état')}
            {choixColonne('numero', 'Colonne du n° de dossier')}
          </div>
          <div className="grid grid-3 gap-3 mt-3">
            {choixColonne('nom', 'Colonne du nom')}
            {choixColonne('prenom', 'Colonne du prénom')}
            {choixColonne('nomComplet', 'ou nom et prénom ensemble')}
          </div>

          <p className="text-sm" style={{ margin: '14px 0 6px' }}>
            <b>{lignes.length}</b> ligne{lignes.length > 1 ? 's' : ''} lue{lignes.length > 1 ? 's' : ''} · <b>{rapprochement.correspondances.length}</b> retrouvée{rapprochement.correspondances.length > 1 ? 's' : ''} · <b>{aMettreAJour.length}</b> à mettre à jour · <b>{rapprochement.nonTrouvees.length}</b> sans dossier correspondant
          </p>
          {aMettreAJour.length > 0 && (
            <div style={{ maxHeight: 240, overflow: 'auto' }}>
              <table className="table">
                <thead><tr><th>Dossier</th><th>Client</th><th>Avant</th><th>Après</th><th>Retrouvé par</th></tr></thead>
                <tbody>
                  {aMettreAJour.slice(0, 200).map(c => (
                    <tr key={c.dossier.id}>
                      <td>{c.dossier.reference || c.dossier.id.slice(0, 8)}</td>
                      <td>{c.dossier.prenom} {c.dossier.nom}</td>
                      <td className="text-muted">{c.dossier.mpr_statut || '—'}</td>
                      <td><b>{c.statut!.statut}</b></td>
                      <td>{c.methode === 'numero' ? 'n° de dossier' : 'nom'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {statutsInconnus.length > 0 && <p className="text-sm text-muted">{statutsInconnus.length} ligne{statutsInconnus.length > 1 ? 's' : ''} avec un état non reconnu (ignorée{statutsInconnus.length > 1 ? 's' : ''}) : « {[...new Set(statutsInconnus.map(c => c.ligne.statutBrut))].slice(0, 3).join(' », « ')} ».</p>}
          {rapprochement.nonTrouvees.length > 0 && (
            <details className="text-sm text-muted">
              <summary>{rapprochement.nonTrouvees.length} ligne{rapprochement.nonTrouvees.length > 1 ? 's' : ''} sans dossier correspondant</summary>
              <ul>{rapprochement.nonTrouvees.slice(0, 50).map((n, i) => <li key={i}>{[n.ligne.prenom, n.ligne.nom].filter(Boolean).join(' ') || n.ligne.numero} — {n.raison === 'ambigu' ? 'plusieurs dossiers portent ce nom' : 'aucun dossier trouvé'}</li>)}</ul>
            </details>
          )}
        </>
      )}
      {resultat && <div className="text-sm" role="status" style={{ marginTop: 12 }}><b>{resultat}</b></div>}
    </Modal>
  )
}
