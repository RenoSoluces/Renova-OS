export function numeroDevis(): string {
  const d = new Date()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `DEV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${rand}`
}
