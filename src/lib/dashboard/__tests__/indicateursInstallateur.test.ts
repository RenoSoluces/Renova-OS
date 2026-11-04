import { describe, expect, it } from 'vitest'
import { indicateursInstallateur } from '../indicateursInstallateur'

describe('indicateursInstallateur', () => {
  const ref = new Date('2026-11-15T12:00:00')
  it('compte les devis signés du mois et le CA TTC', () => {
    const r = indicateursInstallateur([], [
      { statut: 'signe', signature_statut: 'signe', signature_date: '2026-11-03', montant_ttc: 8000.5 },
      { statut: 'signe', signature_statut: 'signe', signature_date: '2026-10-28', montant_ttc: 5000 },
      { statut: 'envoye', signature_statut: 'envoye', montant_ttc: 3000 },
    ], [], ref)
    expect(r.devisSignesMois).toBe(1)
    expect(r.caSigneMois).toBe(8000.5)
    expect(r.devisEnAttente).toBe(1)
  })
  it('dossiers actifs, sans étape et à action Anah', () => {
    const r = indicateursInstallateur([{ statut: null }, { statut: 'Signé' }], [], [
      { statut: 'creation', parcours_etape: null, mpr_statut: 'En attente de compléments d\'information' },
      { statut: 'installe', parcours_etape: 'x' },
    ], ref)
    expect(r.prospectsANouveau).toBe(1)
    expect(r.dossiersActifs).toBe(1)
    expect(r.dossiersSansEtape).toBe(1)
    expect(r.dossiersActionAnah).toBe(1)
  })
})
