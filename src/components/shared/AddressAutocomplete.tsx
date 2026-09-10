import { useEffect, useRef, useState } from 'react'

interface AddressResult { label: string; value: string; city: string; postcode: string }

export function AddressAutocomplete({ value, onChange, onSelect, placeholder = 'Rechercher une adresse…' }: {
  value: string; onChange: (val: string) => void
  onSelect?: (addr: { rue: string; codePostal: string; ville: string }) => void; placeholder?: string
}) {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 3) { setSuggestions([]); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`)
        const data = await res.json()
        setSuggestions((data.features || []).map((f: { properties: Record<string, string> }) => ({
          label: f.properties.label, value: f.properties.name, city: f.properties.city, postcode: f.properties.postcode,
        })))
        setOpen(true)
      } catch { setSuggestions([]) }
    }, 300)
  }, [value])

  const handleSelect = (s: AddressResult) => { onChange(s.label); setOpen(false); setActiveIndex(-1); onSelect?.({ rue: s.value, codePostal: s.postcode, ville: s.city }) }
  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(suggestions[activeIndex]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="address-search" ref={wrapRef}>
      <input className="input" value={value} onChange={e => onChange(e.target.value)} onKeyDown={handleKey} placeholder={placeholder} autoComplete="off" />
      {open && suggestions.length > 0 && (
        <div className="address-suggestions">
          {suggestions.map((s, i) => (
            <div key={i} className={`address-suggestion ${i === activeIndex ? 'active' : ''}`} onClick={() => handleSelect(s)}>
              <div className="address-suggestion-main">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
