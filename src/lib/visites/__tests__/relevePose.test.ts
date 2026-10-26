import { describe, expect, it } from 'vitest'
import { RELEVES_POSE, avancementReleve } from '../relevePose'
import { PRODUITS_VISITE, sectionsPourVisite } from '../../3cl/produitsVisite'

describe('relevé de pose', () => {
  it('chaque produit de VT a un relevé de pose', () => {
    for (const p of PRODUITS_VISITE) expect(RELEVES_POSE.some(r => r.produit === p.id)).toBe(true)
  })
  it('compte les champs obligatoires et les photos', () => {
    const a = avancementReleve('ballon_thermodynamique', { ballon_existant: 'Cumulus électrique', piece: 'Garage', photo_0: 'oui' })
    expect(a.obligatoiresRemplis).toBe(2)
    expect(a.photos).toBe(1)
    expect(a.complet).toBe(false)
  })
  it('une VT multi-produits réunit les sections des produits et le relevé de pose', () => {
    expect(sectionsPourVisite('produit', 'pac', ['ballon_thermodynamique'])).toEqual([1, 2, 8, 9, 11])
    expect(sectionsPourVisite('complete', null)).toContain(11)
  })
})
