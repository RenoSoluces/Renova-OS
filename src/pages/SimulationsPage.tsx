import { useEffect, useState } from 'react'
import { Plus, Calculator, FileSignature, TrendingDown, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { creerDevisDepuisTravaux } from '../lib/devis/creerDevisDepuisTravaux'
import type { Simulation, Prospect, PageKey } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { DpeBig } from '../components/shared/DpeVisualizer'

const DPE_COLORS: Record<string, string> = {
  A: 'badge-success', B: 'badge-success', C: 'badge-info',
  D: 'badge-warning', E: 'badge-warning', F: 'badge-error', G: 'badge-error',
}

interface Props {
  onNavigateToDevis?: (devisId: string) => void
}

export function SimulationsPage({ onNavigateToDevis }: Props = {}) {
  const [rows, setRows] = useState<(Simulation & { prospect?: Prospect })[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<(Simulation & { prospect?: Prospect }) | null>(null)
  const [creatingDevis, setCreatingDevis] = useState(false)

  function fetchListe() {
    setLoading(true)
    supabase
      .from('simulations')
      .select('*, prospect:prospects(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setRows([]); setLoading(false); return }
        setRows((data || []) as any)
        setLoading(false)
      })
  }

  useEffect(() => { fetchListe() }, [])

  const euro = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n) : '—'

  const dpeBadge = (l: string | null | undefined) =>
    l ? <span className={`badge ${DPE_COLORS[l] || 'badge-neutral'}`}>{l}</span> : '—'

  const travauxDe = (s: Simulation) => ((s as any).travaux_json || []) as Array<{
    id: string; titre: string; description: string; gainPourcentage: number; gainCEP: number
    etiquetteAvant: string; etiquetteApres: string
  }>

  async function creerDevis() {
    if (!detail || !detail.prospect_id) return
    const travaux = travauxDe(detail)
    if (travaux.length === 0) return
    setCreatingDevis(true)
    const { devisId, error } = await creerDevisDepuisTravaux({
      prospectId: detail.prospect_id,
      visiteId: detail.visite_id || null,
      batiment: (detail as any).config_avant,
      travaux: travaux as any,
      origine: 'simulation 3CL',
    })
    setCreatingDevis(false)
    if (error) { alert(error); return }
    if (devisId) {
      setDetail(null)
      onNavigateToDevis?.(devisId)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Résultats 3CL</h1>
          <p className="page-subtitle">Historique des résultats enregistrés depuis les visites techniques</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad text-muted">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <Calculator size={40} />
            <h3>Aucune simulation</h3>
            <p>Les résultats 3CL se créent depuis une visite technique, une fois le calcul DPE enregistré.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th><th>Prospect</th>
                  <th>DPE avant</th><th>Travaux recommandés</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} onClick={() => setDetail(s)} style={{ cursor: 'pointer' }}>
                    <td className="font-semibold">{s.nom || `Simulation ${s.id.slice(0, 6)}`}</td>
                    <td>{s.prospect ? `${s.prospect.prenom} ${s.prospect.nom}` : '—'}</td>
                    <td>{dpeBadge((s as any).dpe_avant)}</td>
                    <td className="text-sm text-muted">{travauxDe(s).length} poste{travauxDe(s).length > 1 ? 's' : ''}</td>
                    <td className="text-sm text-muted">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.nom || 'Simulation'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>Fermer</Button>
            {detail && travauxDe(detail).length > 0 && (
              <Button variant="primary" onClick={creerDevis} disabled={creatingDevis}>
                <FileSignature size={16} /> {creatingDevis ? 'Création…' : 'Créer un devis'}
              </Button>
            )}
          </>
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <DpeBig letter={(detail as any).dpe_avant || '—'} />
              <div>
                <div className="text-sm text-muted">Client</div>
                <div className="font-semibold">{detail.prospect ? `${detail.prospect.prenom} ${detail.prospect.nom}` : '—'}</div>
                <div className="text-sm text-muted mt-1">
                  {new Date(detail.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            <div>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={16} /> Travaux recommandés
              </div>
              {travauxDe(detail).length === 0 ? (
                <p className="text-sm text-muted">Aucune recommandation enregistrée pour cette simulation.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {travauxDe(detail).map(t => (
                    <div key={t.id} className="recap-card" style={{ padding: 10 }}>
                      <div className="font-semibold">{t.titre}</div>
                      <div className="text-sm text-muted">{t.description}</div>
                      <div className="text-sm text-muted mt-1" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingDown size={13} /> -{t.gainPourcentage}% ({t.etiquetteAvant} → {t.etiquetteApres})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
