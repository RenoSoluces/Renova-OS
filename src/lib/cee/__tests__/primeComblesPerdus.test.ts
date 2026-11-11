import { describe, expect, it } from 'vitest'
import { tauxPrimeComblesPerdus, zoneCee } from '../primeComblesPerdus'

describe('prime CEE combles perdus', () => {
  it('applique la grille par zone et profil', () => {
    expect(tauxPrimeComblesPerdus('H1', true)).toBe(19.34)
    expect(tauxPrimeComblesPerdus('H1', false)).toBe(13.26)
    expect(tauxPrimeComblesPerdus('H2', true)).toBe(16.8)
    expect(tauxPrimeComblesPerdus('H2', false)).toBe(10.92)
    expect(tauxPrimeComblesPerdus('H3', true)).toBe(10.8)
    expect(tauxPrimeComblesPerdus('H3', false)).toBe(7.02)
  })

  it('prend la zone saisie sur le devis, sinon celle du code postal', () => {
    expect(zoneCee('h1a', '11160')).toBe('H1')
    expect(zoneCee('', '62660')).toBe('H1')
    expect(zoneCee(null, '11160')).toBe('H3')
    expect(zoneCee('', null)).toBeNull()
  })
})
