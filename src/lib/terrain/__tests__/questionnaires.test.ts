import { describe, expect, it } from 'vitest'
import { QUESTIONNAIRES, qualifier, resumeReponses, champsProspectDepuisReponses } from '../questionnaires'

describe('questionnaires terrain', () => {
  it('chaque question a des identifiants uniques par questionnaire', () => {
    for (const q of QUESTIONNAIRES) {
      const ids = q.questions.map(x => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('un propriétaire au fioul avec radiateurs à eau est chaud pour une PAC air/eau', () => {
    const r = qualifier('pac_air_eau', { occupation: 'proprietaire', logement: 'maison', chauffage: 'fioul', emetteurs: 'eau', age_chaudiere: 'plus_20' })
    expect(r?.temperature).toBe('chaud')
    expect(r?.bloquants).toEqual([])
  })
  it('un locataire est froid avec la raison', () => {
    const r = qualifier('pac_air_eau', { occupation: 'locataire', chauffage: 'fioul', emetteurs: 'eau', age_chaudiere: 'plus_20' })
    expect(r?.temperature).toBe('froid')
    expect(r?.bloquants[0]).toMatch(/Locataire/)
  })
  it('résume les réponses et alimente la fiche prospect', () => {
    expect(resumeReponses('photovoltaique', { orientation: 'sud' })).toBe('Questionnaire Solaire — Orientation du toit : Sud')
    expect(champsProspectDepuisReponses({ occupation: 'proprietaire', foyer: '6+', revenus: 'Modeste' })).toEqual({ statut_occupation: 'propriétaire_occupant', nombre_personnes_foyer: 6, categorie_mpr: 'Modeste' })
  })
  it('sans produit, pas de qualification', () => {
    expect(qualifier(null, {})).toBeNull()
  })
})
