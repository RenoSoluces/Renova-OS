import { useState } from 'react'
import { Lock, Loader2, Zap, Check } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'

/** Écran affiché à l'arrivée depuis une invitation ou un lien « mot de passe oublié ». */
export function DefinirMotDePassePage() {
  const { definirMotDePasse, session, signOut } = useAuth()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nom = (session?.user.user_metadata?.nom_complet as string | undefined) || ''
  const assezLong = motDePasse.length >= 8
  const identiques = motDePasse.length > 0 && motDePasse === confirmation

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assezLong) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (!identiques) { setError('Les deux mots de passe ne sont pas identiques.'); return }
    setLoading(true)
    const result = await definirMotDePasse(motDePasse)
    setLoading(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo"><Zap size={20} /></div>
          <div className="login-brand-name">RenovaOS</div>
        </div>
        <h1 className="login-title">{nom ? `Bienvenue ${nom.split(' ')[0]}` : 'Choisissez votre mot de passe'}</h1>
        <p className="login-subtitle">
          Choisissez le mot de passe de votre compte {session?.user.email ? <b>{session.user.email}</b> : null}. Vous l’utiliserez pour vous connecter sur ordinateur, tablette ou téléphone.
        </p>
        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <Lock size={16} />
            <input type="password" placeholder="Nouveau mot de passe (8 caractères minimum)" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="login-field">
            <Lock size={16} />
            <input type="password" placeholder="Confirmez le mot de passe" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" required />
          </div>
          <ul className="login-regles">
            <li className={assezLong ? 'ok' : ''}><Check size={13} /> 8 caractères minimum</li>
            <li className={identiques ? 'ok' : ''}><Check size={13} /> Les deux saisies sont identiques</li>
          </ul>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Enregistrer et accéder à Renova OS'}
          </button>
        </form>
        <button type="button" className="login-lien" onClick={() => { void signOut() }}>Ce n’est pas mon compte</button>
      </div>
    </div>
  )
}
