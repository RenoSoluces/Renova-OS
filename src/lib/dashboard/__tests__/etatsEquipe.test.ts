import { describe, it, expect } from 'vitest'
import { compterParEtat, compterParEtapeParcours, performanceParCollaborateur } from '../etatsEquipe'

describe('tableau de bord : états et équipe', () => {
  it('compte les prospects par état dans l’ordre du pipeline, sans tenir compte des accents', () => {
    const r = compterParEtat([{ statut: 'signe' }, { statut: 'Signé' }, { statut: null }, { statut: 'Qualifié' }, { statut: 'Perdu' }])
    expect(r.map(l => [l.label, l.nb])).toEqual([['Nouveau', 1], ['Qualifié', 1], ['Signé', 2], ['Perdu', 1]])
  })
  it('compte les dossiers par étape de parcours avec une ligne « sans étape »', () => {
    const r = compterParEtapeParcours([{ parcours_etape: 'devis' }, { parcours_etape: 'devis' }, { parcours_etape: null }, { parcours_etape: 'inconnue' }])
    expect(r.find(l => l.label === 'Devis')?.nb).toBe(2)
    expect(r[r.length - 1]).toEqual({ label: 'Sans étape', nb: 2 })
    expect(r.reduce((s, l) => s + l.nb, 0)).toBe(4)
  })
  it('calcule la performance par collaborateur et exclut le profil société', () => {
    const profils = [{ id: 'a', nom_complet: 'Alice' }, { id: 'b', nom_complet: 'Bob' }, { id: 'r', nom_complet: 'RENO SOLUCES' }]
    const prospects = [
      { id: '1', statut: 'Signé', commercial_id: 'a' }, { id: '2', statut: 'Nouveau', commercial_id: 'a' },
      { id: '3', statut: 'Installé', commercial_id: 'b' }, { id: '4', statut: 'Signé', commercial_id: 'r' },
    ]
    const dossiers = [{ prospect_id: '1', statut: 'installe' }, { prospect_id: '3', statut: 'installe' }, { prospect_id: '3', statut: 'creation' }]
    const r = performanceParCollaborateur(prospects, dossiers, profils)
    // égalité à 1 signé : le plus de dossiers passe devant
    expect(r.map(l => l.nom)).toEqual(['Bob', 'Alice'])
    expect(r[1]).toMatchObject({ prospects: 2, signes: 1, dossiers: 1, installes: 1, tauxSignature: 50 })
    expect(r[0]).toMatchObject({ prospects: 1, signes: 1, dossiers: 2, installes: 1, tauxSignature: 100 })
  })
})
