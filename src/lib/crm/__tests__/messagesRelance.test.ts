import { describe, expect, it } from 'vitest'
import { modelesRelance } from '../messagesRelance'

describe('messages de relance', () => {
  it('personnalise le message et signe du prénom du commercial', () => {
    const [m] = modelesRelance('devis', { prenomClient: 'Jean', numeroDevis: 'DEV-1', commercial: 'Mickael Brahimi', entreprise: 'Reno Soluces' })
    expect(m.message.startsWith('Bonjour Jean')).toBe(true)
    expect(m.message).toContain('DEV-1')
    expect(m.message.endsWith('Mickael – Reno Soluces')).toBe(true)
  })
  it('liste les pièces manquantes avec le lien de dépôt', () => {
    const [m] = modelesRelance('pieces', { nomClient: 'Martin', civilite: 'Mme', pieces: ['RIB'], lienEspace: 'https://x/portail/y' })
    expect(m.message).toContain('Bonjour Mme Martin')
    expect(m.message).toContain('• RIB')
    expect(m.message).toContain('https://x/portail/y')
  })
  it('propose trois modèles de relance prospect', () => {
    expect(modelesRelance('relance', {})).toHaveLength(3)
  })
})
