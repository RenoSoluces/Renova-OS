import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn().mockResolvedValue({ error: null })
vi.mock('../../supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))

import { _reinitialiser, estChunkPerime, estDuBruit, normaliserErreur, signalerErreur } from '../rapportErreurs'

describe('rapport d’erreurs', () => {
  beforeEach(() => { rpc.mockClear(); _reinitialiser() })

  it('normalise les erreurs de tout type', () => {
    expect(normaliserErreur(new TypeError('x is undefined')).message).toBe('TypeError: x is undefined')
    expect(normaliserErreur('texte').message).toBe('texte')
    expect(normaliserErreur({ message: 'objet' }).message).toBe('objet')
    expect(normaliserErreur(undefined).message).toBe('Erreur inconnue')
  })

  it('regroupe les répétitions qui ne diffèrent que par un identifiant', () => {
    const a = normaliserErreur('Devis 4f1c2d3e9a introuvable (ligne 12)')
    const b = normaliserErreur('Devis 77ab09cc12 introuvable (ligne 98)')
    expect(a.signature).toBe(b.signature)
  })

  it('ignore le bruit des navigateurs et repère les fichiers périmés après déploiement', () => {
    expect(estDuBruit(normaliserErreur('ResizeObserver loop completed with undelivered notifications.'))).toBe(true)
    expect(estDuBruit(normaliserErreur('Script error.'))).toBe(true)
    expect(estDuBruit(normaliserErreur(new Error('Cannot read properties of null')))).toBe(false)
    expect(estChunkPerime(normaliserErreur(new TypeError('Failed to fetch dynamically imported module: /assets/Devis-abc.js')))).toBe(true)
  })

  it('envoie une erreur une seule fois par session', async () => {
    await signalerErreur(new Error('Boum'), { source: 'test' })
    await signalerErreur(new Error('Boum'), { source: 'test' })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][0]).toBe('signaler_erreur_client')
    expect(rpc.mock.calls[0][1].p_message).toBe('Boum')
    expect(rpc.mock.calls[0][1].p_details.source).toBe('test')
  })

  it('n’envoie rien pour le bruit et ne lève jamais d’exception', async () => {
    rpc.mockRejectedValueOnce(new Error('réseau'))
    await expect(signalerErreur(new Error('Autre'))).resolves.toBeUndefined()
    await signalerErreur('ResizeObserver loop limit exceeded')
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
