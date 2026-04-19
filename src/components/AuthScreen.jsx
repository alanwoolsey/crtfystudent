import { useMemo, useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthScreen() {
  const { pendingChallenge, login, completeNewPassword } = useAuth()
  const [username, setUsername] = useState(pendingChallenge?.username || '')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isChallenge = Boolean(pendingChallenge?.challenge_name === 'NEW_PASSWORD_REQUIRED')
  const panelTitle = useMemo(() => {
    if (isChallenge) return 'Set your new password'
    return 'Sign in'
  }, [isChallenge])

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ username: username.trim(), password })
      setPassword('')
    } catch (nextError) {
      setError(nextError.message || 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleNewPasswordSubmit(event) {
    event.preventDefault()
    setError('')

    if (!newPassword) {
      setError('Enter a new password.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation must match.')
      return
    }

    setIsSubmitting(true)

    try {
      await completeNewPassword({
        username: pendingChallenge?.username || username.trim(),
        newPassword,
        session: pendingChallenge?.session,
      })
      setNewPassword('')
      setConfirmPassword('')
    } catch (nextError) {
      setError(nextError.message || 'Unable to set the new password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img className="auth-logo" src="/logos/crtfy-student.svg" alt="crtfy student" />
          <div className="auth-copy">
            <p className="eyebrow">Secure access</p>
            <h1>{panelTitle}</h1>
            <p>
              {isChallenge
                ? `Finish the required password reset for ${pendingChallenge?.tenant_name || 'your tenant'}.`
                : 'Authenticate before you can access the application.'}
            </p>
          </div>
        </div>

        {isChallenge ? (
          <form className="auth-form" onSubmit={handleNewPasswordSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input value={pendingChallenge?.username || username} disabled />
            </label>
            <label className="auth-field">
              <span>New password</span>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Confirm new password</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
              <LockKeyhole size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Set password and continue'}</span>
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="user@example.com"
                required
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
              <ShieldCheck size={16} />
              <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
