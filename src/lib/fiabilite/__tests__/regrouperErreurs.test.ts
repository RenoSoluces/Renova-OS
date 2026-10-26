import { describe, expect, it } from 'vitest'
import { regrouperErreurs } from '../regrouperErreurs'

const e = (id: string, description: string, actor: string, at: string, page = '/') => ({ id, description, actor_id: actor, created_at: at, meta: { page } })

describe('regroupement des erreurs', () => {
  it('regroupe par cause, compte les utilisateurs et trie par fréquence', () => {
    const g = regrouperErreurs([
      e('1', 'Devis 12 introuvable', 'u1', '2026-10-26T10:00:00Z', '/devis'),
      e('2', 'Devis 98 introuvable', 'u2', '2026-10-26T11:00:00Z', '/devis'),
      e('3', 'Devis 7 introuvable', 'u1', '2026-10-26T09:00:00Z', '/dossiers'),
      e('4', 'Autre erreur', 'u3', '2026-10-26T12:00:00Z'),
    ])
    expect(g).toHaveLength(2)
    expect(g[0]).toMatchObject({ occurrences: 3, utilisateurs: ['u1', 'u2'], pages: ['/devis', '/dossiers'], derniere: '2026-10-26T11:00:00Z', message: 'Devis 98 introuvable' })
    expect(g[1].occurrences).toBe(1)
  })
  it('renvoie une liste vide sans erreur', () => { expect(regrouperErreurs([])).toEqual([]) })
})
