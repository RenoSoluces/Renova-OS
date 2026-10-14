// Le numéro définitif est attribué par le trigger PostgreSQL à l'insertion.
// Cette valeur de secours respecte le format lisible si le trigger n'est pas encore déployé.
export function numeroDevis(): string {
  const d = new Date()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const horodatage = String(Date.now()).slice(-6)
  return `DEV-${d.getFullYear()}-${mois}-${horodatage}`
}
