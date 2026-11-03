/**
 * Clé de jour AAAA-MM-JJ dans le fuseau local de l'utilisateur.
 * `date.toISOString().slice(0, 10)` convertit d'abord en UTC : en France (UTC+1/+2),
 * minuit local tombe la veille en UTC, ce qui décale les rendez-vous d'un jour.
 */
export function jourLocal(date: Date = new Date()): string {
  const a = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const j = String(date.getDate()).padStart(2, '0')
  return `${a}-${m}-${j}`
}
