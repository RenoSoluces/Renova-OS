import { useEffect, useState } from 'react'
import { Check, Copy, Mail, MessageCircle, Share2, Smartphone, X } from 'lucide-react'
import { numeroWhatsApp } from '../../lib/reseau/acces'
import './partage.css'

interface Props {
  titre: string
  sousTitre?: string
  message: string
  telephone?: string | null
  email?: string | null
  sujet?: string
  /** Modèles proposés (ex. relance douce / relance ferme) : le message suit le modèle choisi. */
  modeles?: { id: string; label: string; message: string }[]
  onFermer: () => void
  /** Appelé quand un canal est utilisé (pour journaliser l'envoi). */
  onEnvoye?: (canal: 'partage' | 'whatsapp' | 'sms' | 'email' | 'copie', message: string) => void
}

/** Fenêtre d'envoi d'un message prêt à partir : partage natif, WhatsApp, SMS, e-mail ou copie. */
export function PartageMessage({ titre, sousTitre, message, telephone, email, sujet, modeles, onFermer, onEnvoye }: Props) {
  const [modele, setModele] = useState(modeles?.[0]?.id || '')
  const [texte, setTexte] = useState(modeles?.[0]?.message ?? message)
  const [copie, setCopie] = useState(false)
  const partageNatif = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = numeroWhatsApp(telephone)

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  async function copier() {
    try { await navigator.clipboard.writeText(texte) } catch {
      const z = document.createElement('textarea'); z.value = texte; document.body.appendChild(z); z.select(); document.execCommand('copy'); z.remove()
    }
    setCopie(true); onEnvoye?.('copie', texte); window.setTimeout(() => setCopie(false), 1800)
  }
  async function partager() {
    try { await navigator.share({ title: sujet || titre, text: texte }); onEnvoye?.('partage', texte) } catch { /* annulé */ }
  }

  return (
    <div className="pm-voile" role="dialog" aria-modal="true" aria-label={titre} onClick={e => { if (e.target === e.currentTarget) onFermer() }}>
      <div className="pm-pop">
        <div className="pm-tete"><div><h3>{titre}</h3>{sousTitre && <p>{sousTitre}</p>}</div><button type="button" onClick={onFermer} aria-label="Fermer"><X size={18} /></button></div>
        {modeles && modeles.length > 1 && (
          <div className="pm-modeles" role="radiogroup" aria-label="Modèle de message">
            {modeles.map(m => <button key={m.id} type="button" role="radio" aria-checked={modele === m.id} className={modele === m.id ? 'on' : ''} onClick={() => { setModele(m.id); setTexte(m.message) }}>{m.label}</button>)}
          </div>
        )}
        <textarea className="pm-texte" rows={9} value={texte} onChange={e => setTexte(e.target.value)} aria-label="Message" />
        <div className="pm-actions">
          {partageNatif && <button type="button" className="pm-btn principal" onClick={() => void partager()}><Share2 size={18} /> Partager…</button>}
          <a className="pm-btn whatsapp" href={`https://wa.me/${wa || ''}?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer" onClick={() => onEnvoye?.('whatsapp', texte)}><MessageCircle size={18} /> WhatsApp</a>
          {telephone && <a className="pm-btn" href={`sms:${telephone.replace(/\s+/g, '')}?&body=${encodeURIComponent(texte)}`} onClick={() => onEnvoye?.('sms', texte)}><Smartphone size={18} /> SMS</a>}
          {email && <a className="pm-btn" href={`mailto:${email}?subject=${encodeURIComponent(sujet || titre)}&body=${encodeURIComponent(texte)}`} onClick={() => onEnvoye?.('email', texte)}><Mail size={18} /> E-mail</a>}
          <button type="button" className="pm-btn" onClick={() => void copier()}>{copie ? <Check size={18} /> : <Copy size={18} />} {copie ? 'Copié' : 'Copier'}</button>
        </div>
      </div>
    </div>
  )
}
