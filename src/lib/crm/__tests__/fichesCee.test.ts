import { describe, it, expect } from 'vitest'
import { FICHES_CEE } from '../fichesCee'
import { FICHE_PAR_CATEGORIE } from '../../devis/conformite'

describe('FICHES_CEE', () => {
  it('a des codes uniques au format officiel', () => {
    const codes = FICHES_CEE.map(f => f.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of codes) expect(c === 'VISITE-TECHNIQUE' || /^BAR-(EN|TH)-\d{3}$/.test(c)).toBe(true)
  })

  it('reprend les codes que le moteur de conformité associe aux catégories du catalogue', () => {
    const proposes = new Set(FICHES_CEE.map(f => f.code))
    for (const code of ['BAR-EN-101', 'BAR-EN-102', 'BAR-EN-103', 'BAR-EN-104']) expect(proposes.has(code)).toBe(true)
    for (const code of Object.values(FICHE_PAR_CATEGORIE)) if (/^BAR-/.test(String(code))) expect(proposes.has(String(code))).toBe(true)
  })
})
