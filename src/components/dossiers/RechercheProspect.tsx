import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Prospect } from '../../types'

// Sélecteur de prospect avec recherche au clavier : remplace la liste
// déroulante de plusieurs milliers de noms dans « Nouveau dossier ».

const normaliser = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const libelle = (p: Prospect) =>
  `${[p.prenom, p.nom].filter(Boolean).join(' ') || p.raison_sociale || 'Sans nom'}`

const MAX_RESULTATS = 20

export function RechercheProspect({
  prospects,
  value,
  onChange,
}: {
  prospects: Prospect[]
  value: string
  onChange: (id: string) => void
}) {
  const [recherche, setRecherche] = useState('')

  const index = useMemo(
    () =>
      prospects.map(p => ({
        p,
        cle: normaliser(
          [p.prenom, p.nom, p.nom, p.prenom, p.raison_sociale, p.ville, p.code_postal, p.telephone, p.email]
            .filter(Boolean)
            .join(' ')
        ),
        tel: (p.telephone || '').replace(/\D/g, ''),
      })),
    [prospects]
  )

  const resultats = useMemo(() => {
    const q = normaliser(recherche)
    if (q.length < 2) return []
    const mots = q.split(' ')
    const chiffres = q.replace(/\D/g, '')
    return index
      .filter(
        e => mots.every(m => e.cle.includes(m)) || (chiffres.length >= 4 && e.tel.includes(chiffres))
      )
      .slice(0, MAX_RESULTATS + 1)
      .map(e => e.p)
  }, [recherche, index])

  const choisi = value ? prospects.find(p => p.id === value) : null

  if (choisi) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted">Prospect / client</div>
          <div className="truncate font-medium">{libelle(choisi)}</div>
          <div className="truncate text-sm text-muted">
            {[choisi.code_postal, choisi.ville].filter(Boolean).join(' ')}
            {choisi.telephone ? ` · ${choisi.telephone}` : ''}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 text-muted hover:bg-black/5"
          onClick={() => { onChange(''); setRecherche('') }}
          aria-label="Changer de prospect"
          title="Changer de prospect"
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  const q = recherche.trim()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] px-4 py-3">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          autoFocus
          className="w-full bg-transparent outline-none"
          placeholder="Rechercher un prospect : nom, ville, téléphone…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          aria-label="Rechercher un prospect"
        />
      </div>

      {q.length < 2 ? (
        <p className="text-sm text-muted">Tapez au moins 2 lettres du nom, de la ville ou du téléphone.</p>
      ) : resultats.length === 0 ? (
        <p className="text-sm text-muted">Aucun prospect trouvé pour « {q} ».</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--c-border)]">
          {resultats.slice(0, MAX_RESULTATS).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className="flex w-full flex-col items-start border-b border-[var(--c-border)] px-4 py-2 text-left last:border-b-0 hover:bg-black/5"
            >
              <span className="font-medium">{libelle(p)}</span>
              <span className="text-sm text-muted">
                {[p.code_postal, p.ville].filter(Boolean).join(' ') || 'Ville non renseignée'}
                {p.telephone ? ` · ${p.telephone}` : ''}
              </span>
            </button>
          ))}
          {resultats.length > MAX_RESULTATS && (
            <p className="px-4 py-2 text-sm text-muted">
              Plus de {MAX_RESULTATS} résultats : précisez la recherche.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
