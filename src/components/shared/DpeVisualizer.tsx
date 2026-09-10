import { dpeColor } from '../../lib/3cl/moteur3CL'
import { Check, X, Clock } from 'lucide-react'

export function DpeScale({ activeLetter }: { activeLetter?: string }) {
  const labels = ['A','B','C','D','E','F','G']
  const ranges = ['<70','70-110','110-180','180-250','250-330','330-420','>420']
  return (
    <div className="dpe-scale">
      {labels.map((l, i) => (
        <div key={l} className={`dpe-bar ${activeLetter === l ? 'active' : ''}`} style={{ background: dpeColor(l), opacity: activeLetter && activeLetter !== l ? 0.4 : 1 }}>
          <span className="dpe-bar-label" style={{ color: l >= 'E' ? 'white' : 'var(--neutral-800)' }}>{l}</span>
          <span style={{ color: l >= 'E' ? 'white' : 'var(--neutral-800)' }}>kWh/m²·an</span>
          <span className="dpe-bar-range" style={{ color: l >= 'E' ? 'rgba(255,255,255,0.8)' : 'var(--neutral-600)' }}>{ranges[i]}</span>
        </div>
      ))}
    </div>
  )
}
export function DpeBig({ letter }: { letter: string }) {
  return <div className="dpe-big" style={{ background: dpeColor(letter), color: letter >= 'E' ? 'white' : 'var(--neutral-800)' }}>{letter}</div>
}
export function DpeBeforeAfter({ avant, apres }: { avant: string; apres: string }) {
  return <div className="dpe-before-after"><div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--neutral-500)', marginBottom: 8 }}>AVANT</div><DpeBig letter={avant} /></div><div style={{ color: 'var(--neutral-400)' }}>→</div><div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--neutral-500)', marginBottom: 8 }}>APRÈS</div><DpeBig letter={apres} /></div></div>
}
export function EligibiliteList({ items }: { items: { label: string; status: 'ok' | 'ko' | 'pending' }[] }) {
  return <div className="eligibility-list">{items.map((item, i) => <div key={i} className={`eligibility-item ${item.status}`}>{item.status === 'ok' && <Check size={16} />}{item.status === 'ko' && <X size={16} />}{item.status === 'pending' && <Clock size={16} />}{item.label}</div>)}</div>
}
