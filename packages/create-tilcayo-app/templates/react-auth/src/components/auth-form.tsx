import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../app/auth'
import { authErrorMessage } from '../lib/auth-feedback'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register'
  const { login, register, loginStatus, registerStatus } = useAuth()
  const location = useLocation()
  const [error, setError] = useState('')
  const pending = loginStatus.isLoading || registerStatus.isLoading

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    setError('')
    if (registering && password !== data.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }
    try {
      if (registering) await register({ name: String(data.get('name') ?? '').trim(), email, password })
      else await login({ email, password })
      // GuestOnly redirects to the intended page when the session changes.
    } catch (failure) { setError(authErrorMessage(failure)) }
  }

  return (
    <section className="auth-panel tl-card tl-stack" aria-labelledby="auth-title">
      <header className="tl-stack">
        <h1 id="auth-title" className="tl-heading-2">{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="tl-text-muted">{registering ? 'Enter your details to get started.' : 'Log in to continue to your account.'}</p>
      </header>
      <form onSubmit={submit} aria-busy={pending} className="tl-stack">
        {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
        <fieldset disabled={pending} className="auth-fields tl-stack">
          {registering && <div className="tl-form-group">
            <label className="tl-label" htmlFor="name">Name</label>
            <input className="tl-input" id="name" name="name" autoComplete="name" required minLength={2} maxLength={100} />
          </div>}
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="email">Email</label>
            <input className="tl-input" id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="password">Password</label>
            <input className="tl-input" id="password" name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} aria-describedby={registering ? 'password-help' : undefined} />
            {registering && <p id="password-help" className="tl-text-muted">Use at least 8 characters.</p>}
          </div>
          {registering && <div className="tl-form-group">
            <label className="tl-label" htmlFor="confirm-password">Confirm password</label>
            <input className="tl-input" id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
          </div>}
          <button className="tl-btn tl-btn-primary auth-submit" type="submit">
            {pending ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
          </button>
        </fieldset>
      </form>
      <p className="tl-text-muted">
        {registering ? 'Already have an account? ' : 'New to Tilcayo? '}
        <Link to={registering ? '/login' : '/register'} state={location.state}>{registering ? 'Log in' : 'Create an account'}</Link>
      </p>
    </section>
  )
}
