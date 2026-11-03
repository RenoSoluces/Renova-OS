import { describe, it, expect } from 'vitest'
import { PARCOURS_CEE, etapeParcours, indexEtape, statutValide, libelleParcours } from '../parcoursCee'

describe('parcours CEE', () => {
  it('a des identifiants uniques et au moins un statut par étape', () => {
    const ids = PARCOURS_CEE.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of PARCOURS_CEE) expect(e.statuts.length).toBeGreaterThan(0)
  })
  it('place gagné et perdu à la fin', () => {
    expect(etapeParcours('cee_paye')?.objectif).toBe('gagne')
    expect(etapeParcours('annule')?.objectif).toBe('perdu')
    expect(indexEtape('annule')).toBe(PARCOURS_CEE.length - 1)
  })
  it('valide un statut seulement dans son étape', () => {
    expect(statutValide('devis', 'Signé')).toBe(true)
    expect(statutValide('devis', 'Complet')).toBe(false)
    expect(statutValide('devis', null)).toBe(true)
    expect(statutValide('inconnue', 'Signé')).toBe(false)
  })
  it('formate le libellé', () => {
    expect(libelleParcours('devis', 'Signé')).toBe('Devis · Signé')
    expect(libelleParcours('audit')).toBe('Audit')
    expect(libelleParcours(null)).toBe('—')
  })
})
