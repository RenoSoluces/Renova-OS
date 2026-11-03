import { describe, it, expect } from 'vitest'
import { STATUTS_SAV, statutSav, compterSav } from '../statutsSav'

describe('statuts SAV', () => {
  it('a des valeurs uniques et un seul statut fermé', () => {
    const valeurs = STATUTS_SAV.map(s => s.value)
    expect(new Set(valeurs).size).toBe(valeurs.length)
    expect(STATUTS_SAV.filter(s => !s.ouvert).map(s => s.value)).toEqual(['clos'])
  })
  it('tolère un statut inconnu', () => {
    expect(statutSav('inconnu').label).toBe('inconnu')
    expect(statutSav(null).ouvert).toBe(true)
  })
  it('compte les SAV et limite les réglés aux 30 derniers jours', () => {
    const now = new Date('2026-11-03T12:00:00Z').getTime()
    const c = compterSav([
      { statut: 'ouvert' }, { statut: 'ouvert' }, { statut: 'en_cours' }, { statut: 'rdv_planifie' }, { statut: 'attente_fournisseur' },
      { statut: 'clos', date_cloture: '2026-10-20T10:00:00Z' },
      { statut: 'clos', date_cloture: '2026-08-01T10:00:00Z' },
    ], 30, now)
    expect(c).toEqual({ aTraiter: 2, enCours: 1, rdvPlanifies: 1, attenteFournisseur: 1, regles: 1, ouverts: 5 })
  })
})
