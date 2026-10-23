import { useState } from 'react'
import { Mail, Lock, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) setError(result.error)
    } catch {
      setError('Connexion impossible pour le moment. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo"><Zap size={20} /></div>
          <div className="login-brand-name">RenovaOS</div>
        </div>
        <h1 className="login-title">Connexion</h1>
        <p className="login-subtitle">Accédez à votre espace professionnel Renova OS.</p>

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <Mail size={16} />
            <input type="email" placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="login-field">
            <Lock size={16} />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          {error && <div className="login-error" role="alert">{error}</div>}

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Se connecter'}
          </button>
        </form>
        <p className="login-subtitle" style={{ marginTop: 18, fontSize: 12 }}>
          Les comptes sont créés par l’administration. Contactez votre administrateur pour obtenir un accès.
        </p>
      </div>
    </div>
  )
}
