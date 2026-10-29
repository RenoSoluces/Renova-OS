import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))
import { lireTout } from '../lireTout'

/** Imite une requête Supabase plafonnée à 1 000 lignes par réponse. */
function fausseRequete(total: number) {
  const appels: [number, number][] = []
  const q: any = {
    order: () => q,
    range: (de: number, a: number) => {
      appels.push([de, a])
      const fin = Math.min(a, de + 999, total - 1)
      if (de >= total) return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: Array.from({ length: fin - de + 1 }, (_, i) => ({ id: de + i })), error: null })
    },
  }
  return { q, appels }
}

describe('lireTout', () => {
  it('récupère toutes les lignes au-delà de 1 000', async () => {
    const { q, appels } = fausseRequete(2500)
    const { data, error } = await lireTout(() => q)
    expect(error).toBeNull()
    expect(data).toHaveLength(2500)
    expect(new Set(data.map((r: any) => r.id)).size).toBe(2500)
    expect(appels[0]).toEqual([0, 999])
  })

  it('fonctionne aussi sous 1 000 lignes', async () => {
    const { q } = fausseRequete(996)
    expect((await lireTout(() => q)).data).toHaveLength(996)
  })
})
