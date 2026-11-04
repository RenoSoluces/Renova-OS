import { describe, expect, it } from 'vitest'
import { pageAccueil, pageAutorisee } from '../accesParRole'

describe('accesParRole', () => {
  it('le confirmateur ne voit que les confirmations et l\'agenda', () => {
    expect(pageAutorisee('confirmateur', 'confirmations')).toBe(true)
    expect(pageAutorisee('confirmateur', 'dossiers')).toBe(false)
    expect(pageAutorisee('confirmateur', 'commissions')).toBe(false)
    expect(pageAccueil('confirmateur')).toBe('confirmations')
  })
  it('l\'administratif n\'a ni commissions ni performance', () => {
    expect(pageAutorisee('adv', 'dossiers')).toBe(true)
    expect(pageAutorisee('adv', 'commissions')).toBe(false)
    expect(pageAutorisee('adv', 'performance')).toBe(false)
  })
  it('les rôles non limités gardent tout', () => {
    expect(pageAutorisee('commercial', 'commissions')).toBe(true)
    expect(pageAutorisee('partner_admin', 'dossiers')).toBe(true)
    expect(pageAccueil('commercial')).toBe('dashboard')
  })
})
