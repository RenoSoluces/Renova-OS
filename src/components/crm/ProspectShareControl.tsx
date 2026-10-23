import { useEffect, useState } from 'react'
import { Share2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'

type Organisation = { id: string; nom: string }

export function ProspectShareControl({ prospectId }: { prospectId: string }) {
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [sharedIds, setSharedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [newOrganisationName, setNewOrganisationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const [{ data: orgs }, { data: shares }] = await Promise.all([
      supabase.from('organisations').select('id, nom').eq('type', 'partenaire').eq('actif', true).order('nom'),
      supabase.from('prospect_shares').select('organisation_id').eq('prospect_id', prospectId),
    ])
    setOrganisations((orgs || []) as Organisation[])
    setSharedIds((shares || []).map((s: { organisation_id: string }) => s.organisation_id))
  }

  useEffect(() => { void load() }, [prospectId])

  async function createOrganisation() {
    const nom = newOrganisationName.trim()
    if (!nom) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.from('organisations').insert({ nom, type: 'partenaire', actif: true })
    if (error) setMessage(error.code === '23505' ? 'Une organisation porte déjà ce nom.' : 'Impossible de créer le partenaire.')
    else {
      setNewOrganisationName('')
      setMessage('Organisation partenaire créée. Le compte du partenaire devra être invité séparément.')
      await load()
    }
    setLoading(false)
  }

  async function share() {
    if (!selectedId) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.from('prospect_shares').insert({
      prospect_id: prospectId,
      organisation_id: selectedId,
      shared_by: (await supabase.auth.getUser()).data.user?.id,
    })
    if (error) setMessage(error.message.includes('duplicate') ? 'Ce prospect est déjà partagé avec ce partenaire.' : 'Le partage a échoué. Vérifiez les droits et réessayez.')
    else {
      setMessage('Prospect partagé avec le partenaire.')
      setSelectedId('')
      await load()
    }
    setLoading(false)
  }

  async function unshare(organisationId: string) {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.from('prospect_shares').delete()
      .eq('prospect_id', prospectId).eq('organisation_id', organisationId)
    if (error) setMessage('Impossible de retirer ce partage.')
    else {
      setMessage('Partage retiré.')
      await load()
    }
    setLoading(false)
  }

  return (
    <div className="right-mini-section">
      <div className="right-mini-section-label"><Share2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Partager avec un partenaire</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          className="pipeline-inline-input"
          value={newOrganisationName}
          onChange={e => setNewOrganisationName(e.target.value)}
          placeholder="Nom du nouveau partenaire"
          aria-label="Nom du nouveau partenaire"
        />
        <Button variant="ghost" onClick={createOrganisation} disabled={!newOrganisationName.trim() || loading}>Créer</Button>
      </div>
      {organisations.length === 0 ? (
        <div className="text-xs text-muted">Aucune organisation partenaire n’est encore créée.</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="pipeline-inline-input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choisir un partenaire…</option>
            {organisations.filter(o => !sharedIds.includes(o.id)).map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
          </select>
          <Button variant="primary" onClick={share} disabled={!selectedId || loading}>Partager</Button>
        </div>
      )}
      {sharedIds.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {sharedIds.map(id => {
            const org = organisations.find(o => o.id === id)
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span>{org?.nom || 'Partenaire'}</span>
                <button type="button" className="btn btn-outline" disabled={loading} onClick={() => void unshare(id)} aria-label="Retirer le partage">
                  <X size={13} /> Retirer
                </button>
              </div>
            )
          })}
        </div>
      )}
      {message && <div className="text-xs text-muted" role="status" style={{ marginTop: 6 }}>{message}</div>}
    </div>
  )
}
