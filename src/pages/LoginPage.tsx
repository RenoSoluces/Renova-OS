import { useState } from 'react'
import { Mail, Lock, User, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomComplet, setNomComplet] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      if (!nomComplet.trim()) { setError('Indiquez votre nom complet.'); setLoading(false); return }
      const { error } = await signUp(email, password, nomComplet.trim())
      if (error) setError(error)
      else setInfo('Compte créé. Si la confirmation par email est activée sur votre projet Supabase, vérifiez votre boîte mail avant de vous connecter.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-logo"><Zap size={20} /></div>
          <div className="login-brand-name">RenovaOS</div>
        </div>
        <h1 className="login-title">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Accédez à votre espace commercial rénovation énergétique.'
            : 'Rejoignez votre équipe sur RenovaOS.'}
        </p>

        <form onSubmit={submit} className="login-form">
          {mode === 'signup' && (
            <div className="login-field">
              <User size={16} />
              <input placeholder="Nom complet" value={nomComplet} onChange={e => setNomComplet(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="login-field">
            <Mail size={16} />
            <input type="email" placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="login-field">
            <Lock size={16} />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} />
          </div>

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-info">{info}</div>}

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
          </button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? (
            <>Pas encore de compte ? <button onClick={() => { setMode('signup'); setError(null); setInfo(null) }}>Créer un compte</button></>
          ) : (
            <>Déjà un compte ? <button onClick={() => { setMode('login'); setError(null); setInfo(null) }}>Se connecter</button></>
          )}
        </div>
      </div>
    </div>
  )
}
