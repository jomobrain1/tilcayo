import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../app/auth'
import { authErrorMessage } from '../lib/auth-feedback'
import { PasswordField } from './password-field'
import { toast } from '../lib/toast'

export function AuthForm({ mode, successMessage }: { mode: 'login' | 'register'; successMessage?: string }) {
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
      const response = registering
        ? await register({ name: String(data.get('name') ?? '').trim(), email, password })
        : await login({ email, password })
      toast.success(successMessage?.trim() || response.message?.trim() || (registering ? 'Your account is ready!' : 'Welcome back!'))
      // GuestOnly redirects to the intended page when the session changes.
    } catch (failure) { setError(authErrorMessage(failure)) }
  }

  return (
    <section className="auth-panel tl-card tl-stack" aria-labelledby="auth-title">
      <header className="auth-heading">
        <span className="auth-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 10 9-8 9 8M5 9v12h14V9M9 21v-8h6v8" />
          </svg>
        </span>
        <h1 id="auth-title" className="tl-heading-2">{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="tl-text-muted">{registering ? 'Enter your details to get started.' : 'Log in to continue to your account.'}</p>
      </header>
      <form onSubmit={submit} aria-busy={pending} className="tl-stack">
        {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
        <fieldset disabled={pending} className="auth-fields tl-stack">
          {registering && <div className="tl-form-group">
            <label className="tl-label" htmlFor="name">Full name</label>
            <input className="tl-input" id="name" name="name" autoComplete="name" placeholder="Alex Carter" required minLength={2} maxLength={100} />
          </div>}
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="email">Email</label>
            <input className="tl-input" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          </div>
          <PasswordField name="password" label="Password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} />
          {registering && <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" />}
          <button className="tl-btn tl-btn-primary auth-submit" type="submit">
            {pending ? 'Please wait...' : registering ? 'Create account' : 'Log in'}
          </button>
        </fieldset>
      </form>
      {!registering && <p className="auth-footer"><Link to="/forgot-password">Forgot password?</Link></p>}
      <p className="auth-footer tl-text-muted">
        {registering ? 'Already have an account? ' : 'New to Tilcayo? '}
        <Link to={registering ? '/login' : '/register'} state={location.state}>{registering ? 'Log in' : 'Create an account'}</Link>
      </p>
    </section>
  )
}
