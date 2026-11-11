import { describe, expect, it } from 'vitest'
import { montantPrimeComblesPerdus, tauxPrimeComblesPerdus, zoneCee } from '../primeComblesPerdus'

describe('prime CEE combles perdus', () => {
  it('applique la grille par zone et profil, majorée de 5,5 %', () => {
    expect(tauxPrimeComblesPerdus('H1', true)).toBeCloseTo(20.4037, 4)
    expect(tauxPrimeComblesPerdus('H1', false)).toBeCloseTo(13.9893, 4)
    expect(tauxPrimeComblesPerdus('H2', true)).toBeCloseTo(17.724, 4)
    expect(tauxPrimeComblesPerdus('H2', false)).toBeCloseTo(11.5206, 4)
    expect(tauxPrimeComblesPerdus('H3', true)).toBeCloseTo(11.394, 4)
    expect(tauxPrimeComblesPerdus('H3', false)).toBeCloseTo(7.4061, 4)
  })

  it('arrondit le montant final, pas le taux', () => {
    expect(montantPrimeComblesPerdus('H1', true, 91)).toBe(1856.74)
    expect(montantPrimeComblesPerdus('H1', false, 70)).toBe(979.25)
  })

  it('prend la zone saisie sur le devis, sinon celle du code postal', () => {
    expect(zoneCee('h1a', '11160')).toBe('H1')
    expect(zoneCee('', '62660')).toBe('H1')
    expect(zoneCee(null, '11160')).toBe('H3')
    expect(zoneCee('', null)).toBeNull()
  })
})
