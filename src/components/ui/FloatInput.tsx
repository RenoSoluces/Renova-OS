import { useState, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface FloatInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string | number | null | undefined
  onChange: (value: string) => void
}

export function FloatInput({ label, value, onChange, ...rest }: FloatInputProps) {
  const [focused, setFocused] = useState(false)
  const filled = value !== null && value !== undefined && value !== ''
  return (
    <div className={`float-label ${filled ? 'filled' : ''}`}>
      <input
        {...rest}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
        onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
        placeholder={focused ? '' : ''}
      />
      <label>{label}</label>
      {filled && !rest.type && <Check className="check-icon" />}
    </div>
  )
}

interface FloatSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function FloatSelect({ label, value, onChange, options, ...rest }: FloatSelectProps) {
  const filled = value !== null && value !== undefined && value !== ''
  return (
    <div className={`float-label ${filled ? 'filled' : ''}`}>
      <select
        {...rest}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="" disabled hidden></option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label>{label}</label>
      <ChevronDown className="select-arrow" size={16} />
    </div>
  )
}

interface FloatTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label: string
  value: string | null | undefined
  onChange: (value: string) => void
}

export function FloatTextarea({ label, value, onChange, ...rest }: FloatTextareaProps) {
  const filled = value !== null && value !== undefined && value !== ''
  return (
    <div className={`float-label ${filled ? 'filled' : ''}`}>
      <textarea
        {...rest}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      <label>{label}</label>
    </div>
  )
}

interface OptionCardProps {
  badge?: string
  title: string
  desc?: string
  selected: boolean
  onClick: () => void
}

export function OptionCard({ badge, title, desc, selected, onClick }: OptionCardProps) {
  return (
    <button type="button" className={`option-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      {badge && <div className="option-card-badge">{badge}</div>}
      <div className="option-card-title">{title}</div>
      {desc && <div className="option-card-desc">{desc}</div>}
    </button>
  )
}

interface OptionCardGridProps {
  options: { value: string; label: string; badge?: string; desc?: string }[]
  value: string | null | undefined
  onChange: (value: string) => void
  cols?: 2 | 3 | 4
}

export function OptionCardGrid({ options, value, onChange, cols = 2 }: OptionCardGridProps) {
  return (
    <div className={`option-cards cols-${cols}`}>
      {options.map(o => (
        <OptionCard
          key={o.value}
          badge={o.badge}
          title={o.label}
          desc={o.desc}
          selected={value === o.value}
          onClick={() => onChange(o.value)}
        />
      ))}
    </div>
  )
}

interface UploadZoneProps {
  onUpload: (file: File) => void
  label?: string
  icon?: ReactNode
}

export function UploadZone({ onUpload, label = 'Glissez une photo ou cliquez pour parcourir', icon }: UploadZoneProps) {
  return (
    <label className="upload-zone">
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />
      {icon}
      <h4>{label}</h4>
      <p>JPG, PNG — 10 Mo max</p>
    </label>
  )
}
