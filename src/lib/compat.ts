// Compatibilité Safari/iPadOS : certaines versions ne disposent pas encore
// de structuredClone() ou de crypto.randomUUID().
const compatibleGlobal = globalThis as typeof globalThis & {
  structuredClone?: <T>(value: T) => T
}

if (typeof compatibleGlobal.structuredClone !== 'function') {
  compatibleGlobal.structuredClone = <T>(value: T): T => {
    // Les objets des calculs 3CL sont des données JSON simples.
    return JSON.parse(JSON.stringify(value)) as T
  }
}

if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function' && typeof crypto.getRandomValues === 'function') {
  Object.defineProperty(crypto, 'randomUUID', {
    configurable: true,
    value: () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
    },
  })
}
