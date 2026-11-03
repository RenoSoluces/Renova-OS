import { useCallback, useEffect, useState } from 'react'
import { Download, Plus, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { conditionsLicence, VERSION_CONDITIONS } from '../lib/licence/conditionsLicence'
import { genererModelePDF } from '../lib/pdf/genererModelePDF'

interface Licence {
  id: string; organisation_id: string; statut: string; nb_licences: number; prix_ht_mensuel: number; engagement_mois: number; preavis_jours: number; essai_jours: number
  debut: string | null; client_raison_sociale: string | null; client_forme: string | null; client_siret: string | null
  client_adresse: string | null; client_code_postal: string | null; client_ville: string | null
  signataire_nom: string | null; signataire_fonction: string | null; signataire_email: string | null
  conditions_version: string | null; conditions_envoyees_le: string | null; acceptees_le: string | null; acceptees_par: string | null; notes: string | null
  organisation?: { nom: string } | null
}

const STATUTS: Record<string, string> = { brouillon: 'Brouillon', essai: 'Essai', active: 'Active', suspendue: 'Suspendue', resiliee: 'Résiliée' }
const dateFr = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—')
const FOURNISSEUR_CLE = 'renova.licence.fournisseur'

export function LicencesPage() {
  const [licences, setLicences] = useState<Licence[]>([])
  const [edition, setEdition] = useState<Licence | null>(null)
  const [nouveau, setNouveau] = useState(false)
  const [nomNouveau, setNomNouveau] = useState('')
  const [message, setMessage] = useState('')
  const [fournisseur, setFournisseur] = useState(() => {
    try { return { ...{ nom: 'Reno Soluces', siret: '', adresse: 'Trausse (Aude)' }, ...JSON.parse(localStorage.getItem(FOURNISSEUR_CLE) || '{}') } } catch { return { nom: 'Reno Soluces', siret: '', adresse: 'Trausse (Aude)' } }
  })

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('licences').select('*, organisation:organisations(nom)').order('created_at', { ascending: false })
    if (error) setMessage(`Lecture impossible : ${error.message}`)
    setLicences(((data || []) as any[]).map(l => ({ ...l, organisation: Array.isArray(l.organisation) ? l.organisation[0] : l.organisation })))
  }, [])
  useEffect(() => { void charger() }, [charger])
  useEffect(() => { try { localStorage.setItem(FOURNISSEUR_CLE, JSON.stringify(fournisseur)) } catch { /* stockage indisponible */ } }, [fournisseur])

  async function creer() {
    const nom = nomNouveau.trim()
    if (!nom) return
    setMessage('')
    const { data: org, error } = await supabase.from('organisations').insert({ nom, type: 'partenaire', actif: true, licences_max: 1, invitations_autorisees: false }).select('id').single()
    if (error || !org) { setMessage(`Création de l'entreprise impossible : ${error?.message}`); return }
    const { error: e2 } = await supabase.from('licences').insert({ organisation_id: org.id, client_raison_sociale: nom })
    if (e2) { setMessage(`Création de la licence impossible : ${e2.message}`); return }
    setNouveau(false); setNomNouveau(''); setMessage('Licence créée en brouillon : complétez les conditions puis envoyez-les au client.')
    void charger()
  }

  async function enregistrer(l: Licence) {
    const { organisation, id, ...champs } = l
    void organisation
    const { error } = await supabase.from('licences').update({ ...champs, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setMessage(`Enregistrement impossible : ${error.message}`); return false }
    // Le nombre de comptes autorisés de l'entreprise suit la licence.
    await supabase.from('organisations').update({ licences_max: l.nb_licences, invitations_autorisees: false }).eq('id', l.organisation_id)
    setMessage('Licence enregistrée.'); void charger(); return true
  }

  const pdf = (l: Licence) => {
    const t = conditionsLicence({
      fournisseur: fournisseur.nom, fournisseurSiret: fournisseur.siret, fournisseurAdresse: fournisseur.adresse,
      client: l.client_raison_sociale || l.organisation?.nom || '', clientForme: l.client_forme || undefined, clientSiret: l.client_siret || undefined,
      clientAdresse: [l.client_adresse, l.client_code_postal, l.client_ville].filter(Boolean).join(' '),
      nbLicences: l.nb_licences, prixHtMensuel: Number(l.prix_ht_mensuel), engagementMois: l.engagement_mois, preavisJours: l.preavis_jours, essaiJours: l.essai_jours,
      debut: l.debut ? dateFr(l.debut) : undefined,
    })
    const blob = genererModelePDF({ titre: t.titre, corps: t.corps, emetteur: fournisseur.nom })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Contrat_licence_${(l.organisation?.nom || 'client').replace(/[^\w]+/g, '_')}.pdf`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  async function envoyerConditions(l: Licence) {
    const { error } = await supabase.from('licences').update({ conditions_version: VERSION_CONDITIONS, conditions_envoyees_le: new Date().toISOString(), acceptees_le: null, acceptees_par: null }).eq('id', l.id)
    setMessage(error ? `Impossible : ${error.message}` : 'Conditions soumises : le dirigeant du client devra les accepter à sa prochaine connexion.')
    void charger()
  }

  const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')) || 0)

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Licences</h1><p className="page-subtitle">Entreprises clientes de Renova OS : tarif, conditions, acceptation et statut</p></div>
        <div className="page-actions"><Button variant="primary" onClick={() => setNouveau(true)}><Plus size={16} /> Nouvelle licence</Button></div>
      </div>
      {message && <div className="card card-pad" role="status" style={{ marginBottom: 12 }}>{message}</div>}
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="font-semibold" style={{ marginBottom: 8 }}>Fournisseur (vous) — repris dans le contrat</div>
        <div className="grid grid-3 gap-3">
          <FloatInput label="Raison sociale" value={fournisseur.nom} onChange={v => setFournisseur((f: any) => ({ ...f, nom: v }))} />
          <FloatInput label="SIRET" value={fournisseur.siret} onChange={v => setFournisseur((f: any) => ({ ...f, siret: v }))} />
          <FloatInput label="Adresse" value={fournisseur.adresse} onChange={v => setFournisseur((f: any) => ({ ...f, adresse: v }))} />
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Entreprise</th><th>Statut</th><th>Licences</th><th>Prix HT/mois</th><th>Conditions</th><th></th></tr></thead>
          <tbody>
            {licences.length === 0 && <tr><td colSpan={6} className="text-muted">Aucune licence. Créez-en une pour votre premier client installateur.</td></tr>}
            {licences.map(l => (
              <tr key={l.id}>
                <td><b>{l.organisation?.nom || l.client_raison_sociale}</b></td>
                <td>{STATUTS[l.statut] || l.statut}</td>
                <td>{l.nb_licences}</td>
                <td>{Number(l.prix_ht_mensuel).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                <td>{l.acceptees_le ? `Acceptées le ${dateFr(l.acceptees_le)} par ${l.acceptees_par}` : l.conditions_envoyees_le ? `Envoyées le ${dateFr(l.conditions_envoyees_le)}` : 'Non envoyées'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Button variant="ghost" size="sm" onClick={() => setEdition(l)}>Modifier</Button>
                  <Button variant="ghost" size="sm" onClick={() => pdf(l)} title="Télécharger le contrat"><Download size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => void envoyerConditions(l)} title="Soumettre les conditions à l'acceptation du client"><Send size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: 10 }}>Le texte du contrat est un projet à faire valider par un juriste avant la première signature. Une licence « suspendue » ou « résiliée » est un repère de gestion : l'arrêt effectif des accès se fait dans l'organigramme.</p>

      <Modal open={nouveau} onClose={() => setNouveau(false)} title="Nouvelle licence" footer={<><Button variant="ghost" onClick={() => setNouveau(false)}>Annuler</Button><Button variant="primary" onClick={() => void creer()} disabled={!nomNouveau.trim()}>Créer</Button></>}>
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>Crée l'entreprise cliente (1 licence, création de comptes par le client désactivée) et une licence en brouillon à 39 € HT/mois.</p>
        <FloatInput label="Nom de l'entreprise" value={nomNouveau} onChange={setNomNouveau} />
      </Modal>

      {edition && (
        <Modal open onClose={() => setEdition(null)} title={`Licence — ${edition.organisation?.nom || ''}`} width={760}
          footer={<><Button variant="ghost" onClick={() => setEdition(null)}>Fermer</Button><Button variant="primary" onClick={async () => { if (await enregistrer(edition)) setEdition(null) }}>Enregistrer</Button></>}>
          <div className="grid grid-3 gap-3">
            <FloatSelect label="Statut" value={edition.statut} onChange={v => setEdition({ ...edition, statut: v })} options={Object.entries(STATUTS).map(([value, label]) => ({ value, label }))} />
            <FloatInput label="Nombre de licences" inputMode="numeric" value={edition.nb_licences} onChange={v => setEdition({ ...edition, nb_licences: Math.max(1, Math.round(num(v))) })} />
            <FloatInput label="Prix HT par mois et par licence (€)" inputMode="decimal" value={edition.prix_ht_mensuel} onChange={v => setEdition({ ...edition, prix_ht_mensuel: num(v) })} />
            <FloatInput label="Engagement (mois)" inputMode="numeric" value={edition.engagement_mois} onChange={v => setEdition({ ...edition, engagement_mois: Math.round(num(v)) })} />
            <FloatInput label="Préavis (jours)" inputMode="numeric" value={edition.preavis_jours} onChange={v => setEdition({ ...edition, preavis_jours: Math.round(num(v)) })} />
            <FloatInput label="Essai gratuit (jours)" inputMode="numeric" value={edition.essai_jours} onChange={v => setEdition({ ...edition, essai_jours: Math.round(num(v)) })} />
            <FloatInput label="Début" type="date" value={edition.debut || ''} onChange={v => setEdition({ ...edition, debut: v || null })} />
            <FloatInput label="Raison sociale" value={edition.client_raison_sociale} onChange={v => setEdition({ ...edition, client_raison_sociale: v })} />
            <FloatInput label="Forme juridique" value={edition.client_forme} onChange={v => setEdition({ ...edition, client_forme: v })} />
            <FloatInput label="SIRET" value={edition.client_siret} onChange={v => setEdition({ ...edition, client_siret: v })} />
            <FloatInput label="Adresse" value={edition.client_adresse} onChange={v => setEdition({ ...edition, client_adresse: v })} />
            <FloatInput label="Code postal" value={edition.client_code_postal} onChange={v => setEdition({ ...edition, client_code_postal: v })} />
            <FloatInput label="Ville" value={edition.client_ville} onChange={v => setEdition({ ...edition, client_ville: v })} />
            <FloatInput label="Signataire" value={edition.signataire_nom} onChange={v => setEdition({ ...edition, signataire_nom: v })} />
            <FloatInput label="Fonction" value={edition.signataire_fonction} onChange={v => setEdition({ ...edition, signataire_fonction: v })} />
            <FloatInput label="E-mail du signataire" value={edition.signataire_email} onChange={v => setEdition({ ...edition, signataire_email: v })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
