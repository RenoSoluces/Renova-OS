import { useState } from 'react'
import { Mail, Lock, Loader2, Zap, ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'

export function LoginPage() {
  const { signIn, envoyerLienMotDePasse } = useAuth()
  const [mode, setMode] = useState<'connexion' | 'oubli'>('connexion')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'oubli') {
        const result = await envoyerLienMotDePasse(email)
        if (result.error) setError(result.error)
        else setInfo('Si un compte existe pour cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les courriers indésirables.')
      } else {
        const result = await signIn(email, password)
        if (result.error) setError(result.error)
      }
    } catch {
      setError('Action impossible pour le moment. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  function changerMode(suivant: 'connexion' | 'oubli') {
    setMode(suivant)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo"><Zap size={20} /></div>
          <div className="login-brand-name">RenovaOS</div>
        </div>
        <h1 className="login-title">{mode === 'oubli' ? 'Mot de passe oublié' : 'Connexion'}</h1>
        <p className="login-subtitle">
          {mode === 'oubli'
            ? 'Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.'
            : 'Accédez à votre espace professionnel Renova OS.'}
        </p>

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <Mail size={16} />
            <input type="email" placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          {mode === 'connexion' && (
            <div className="login-field">
              <Lock size={16} />
              <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
          )}

          {error && <div className="login-error" role="alert">{error}</div>}
          {info && <div className="login-info" role="status">{info}</div>}

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : mode === 'oubli' ? 'Recevoir le lien' : 'Se connecter'}
          </button>
        </form>
        {mode === 'connexion'
          ? <button type="button" className="login-lien" onClick={() => changerMode('oubli')}>Mot de passe oublié ?</button>
          : <button type="button" className="login-lien" onClick={() => changerMode('connexion')}><ArrowLeft size={14} /> Retour à la connexion</button>}
        <p className="login-subtitle" style={{ marginTop: 18, fontSize: 12 }}>
          Les comptes sont créés par l’administration. Contactez votre administrateur pour obtenir un accès.
        </p>
      </div>
    </div>
  )
}
