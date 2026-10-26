import { describe, expect, it } from 'vitest'
import { genererMotDePasse, messageAcces, motDePasseValide, numeroWhatsApp } from '../acces'

describe('accès réseau', () => {
  it('génère des mots de passe provisoires conformes', () => {
    for (let i = 0; i < 50; i++) expect(motDePasseValide(genererMotDePasse())).toBe(true)
  })
  it('compose le message avec identifiants', () => {
    const m = messageAcces({ prenom: 'Karim', type: 'apporteur', email: 'k@x.fr', motDePasse: 'Abc!12345678', lien: 'https://renova-os.netlify.app/', entreprise: 'Reno Soluces', invitePar: 'Mickael' })
    expect(m).toContain('Identifiant : k@x.fr')
    expect(m).toContain('Abc!12345678')
  })
  it('rédige un message neutre pour le compte d’une autre entreprise', () => {
    const m = messageAcces({ prenom: 'Lina', type: 'partenaire', email: 'l@p.fr', motDePasse: 'Abc!12345678', lien: 'https://renova-os.netlify.app/', entreprise: 'Primy Solutions', invitePar: 'Mickael Brahimi', autreEntreprise: true })
    expect(m).toContain('Votre espace Primy Solutions sur Renova OS est prêt.')
    expect(m).toContain('Abc!12345678')
    expect(m).not.toMatch(/Mickael|partenaire|Reno Soluces/i)
  })
  it('formate le numéro WhatsApp', () => {
    expect(numeroWhatsApp('06 12 34 56 78')).toBe('33612345678')
    expect(numeroWhatsApp('+33 6 12 34 56 78')).toBe('33612345678')
    expect(numeroWhatsApp('')).toBeNull()
  })
})
