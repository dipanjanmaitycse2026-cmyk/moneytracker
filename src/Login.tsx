import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim() || email.split('@')[0],
            },
          },
        })

        if (error) throw error
        setInfoMessage('Account created! Check your email to confirm your account, or sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand auth-brand">
            <span className="brand-icon">₹</span>
            <span>
              Monetra<span className="brand-dot">.</span>
            </span>
          </div>
          <h1>{isSignUp ? 'Create an account' : 'Welcome back'}</h1>
          <p className="page-subtitle">
            {isSignUp
              ? 'Start tracking and managing your finances with Monetra.'
              : 'Sign in to access your financial overview and records.'}
          </p>
        </div>

        {errorMessage && (
          <div style={{ color: 'var(--red)', fontSize: '11px', textAlign: 'center', marginBottom: '12px' }}>
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div style={{ color: 'var(--green)', fontSize: '11px', textAlign: 'center', marginBottom: '12px' }}>
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="form-field">
              <label htmlFor="auth-name">FULL NAME</label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. Alex Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">EMAIL ADDRESS</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">PASSWORD</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-button auth-submit" disabled={loading}>
            <span>{loading ? '…' : isSignUp ? '✦' : '→'}</span>
            {loading ? 'Processing...' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            type="button"
            className="text-toggle"
            onClick={() => {
              setIsSignUp((prev) => !prev)
              setErrorMessage(null)
              setInfoMessage(null)
            }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}