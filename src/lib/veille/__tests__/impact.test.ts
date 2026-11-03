import { describe, it, expect } from 'vitest'
import { etatTexte, joursAvantEffet, dossiersConcernes, normaliserFiche, type DossierVeille } from '../impact'

describe('état d\'un texte', () => {
  it('un projet reste un projet quelle que soit la date', () => {
    expect(etatTexte({ type_texte: 'projet', date_effet: '2026-01-01' }, '2026-11-03')).toBe('projet')
  })
  it('distingue à venir, en vigueur et sans date', () => {
    expect(etatTexte({ type_texte: 'arrete', date_effet: '2026-12-01' }, '2026-11-03')).toBe('a_venir')
    expect(etatTexte({ type_texte: 'arrete', date_effet: '2026-11-03' }, '2026-11-03')).toBe('en_vigueur')
    expect(etatTexte({ type_texte: 'decret', date_effet: null }, '2026-11-03')).toBe('sans_date')
  })
  it('compte les jours avant la date d\'effet', () => {
    expect(joursAvantEffet('2026-11-13', '2026-11-03')).toBe(10)
    expect(joursAvantEffet('2026-11-01', '2026-11-03')).toBe(-2)
    expect(joursAvantEffet(null, '2026-11-03')).toBeNull()
  })
})

describe('dossiers concernés', () => {
  const dossiers: DossierVeille[] = [
    { id: '1', reference: 'DOS-1', statut: 'signe', client: 'A', fiches: ['BAR-TH-159'] },
    { id: '2', reference: 'DOS-2', statut: 'installe', client: 'B', fiches: ['BAR-TH-159'] },
    { id: '3', reference: 'DOS-3', statut: 'creation', client: 'C', fiches: ['bar th 171', 'BAR-EN-101'] },
    { id: '4', reference: 'DOS-4', statut: 'installation', client: 'D', fiches: [] },
  ]
  it('ne retient que les dossiers en cours dont une fiche est visée', () => {
    expect(dossiersConcernes({ fiches_concernees: ['BAR-TH-159'] }, dossiers).map(d => d.id)).toEqual(['1'])
  })
  it('compare les fiches sans tenir compte de la casse ni des séparateurs', () => {
    expect(normaliserFiche('bar th_171')).toBe('BARTH171')
    expect(dossiersConcernes({ fiches_concernees: ['BAR-TH-171'] }, dossiers).map(d => d.id)).toEqual(['3'])
  })
  it('une entrée sans fiche ne désigne aucun dossier', () => {
    expect(dossiersConcernes({ fiches_concernees: [] }, dossiers)).toEqual([])
  })
})
