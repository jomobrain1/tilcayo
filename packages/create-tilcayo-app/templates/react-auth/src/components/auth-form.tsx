import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../app/auth'
import { authErrorMessage } from '../lib/auth-feedback'
import { AuthInputIcon } from './auth-input-icon'
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
      if (registering) await register({ name: String(data.get('name') ?? '').trim(), email, password })
      else await login({ email, password })
      toast.success(successMessage?.trim() || (registering ? 'Account created.' : 'Logged in.'))
      // GuestOnly redirects to the intended page when the session changes.
    } catch (failure) { setError(authErrorMessage(failure)) }
  }

  return (
    <section className="auth-panel auth-account-form tl-stack" aria-labelledby="auth-title">
      <header className="auth-heading">
        <h1 id="auth-title" className="tl-heading-2">{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p>{registering ? 'Set up your Tilcayo account' : 'Sign in to your Tilcayo account'}</p>
      </header>
      <form onSubmit={submit} aria-busy={pending} className="tl-stack">
        {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
        <fieldset disabled={pending} className="auth-fields tl-stack">
          {registering && <div className="tl-form-group">
            <label className="tl-label" htmlFor="name">Full name</label>
            <div className="auth-input-wrap"><AuthInputIcon kind="name" /><input className="tl-input" id="name" name="name" autoComplete="name" placeholder="Your full name" required minLength={2} maxLength={100} /></div>
          </div>}
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="email">Email</label>
            <div className="auth-input-wrap"><AuthInputIcon kind="email" /><input className="tl-input" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></div>
          </div>
          <PasswordField name="password" label="Password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Password (at least 8 characters)' : 'Enter your password'} />
          {registering && <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" placeholder="Confirm password" />}
          {!registering && <div className="auth-form-options"><Link to="/forgot-password">Forgot password?</Link></div>}
          <button className="tl-btn tl-btn-primary auth-submit" type="submit">
            {pending ? 'Please wait...' : registering ? 'Create account' : 'Log in'}{!pending && <span aria-hidden="true">&#8594;</span>}
          </button>
        </fieldset>
      </form>
      <div className="auth-alternate">
        <p className="auth-alternate-label">{registering ? 'Already have an account?' : 'New to Tilcayo?'}</p>
        <Link className="tl-btn tl-btn-outline auth-alternate-link" to={registering ? '/login' : '/register'} state={location.state}>{registering ? 'Log in' : 'Create an account'}</Link>
      </div>
    </section>
  )
}
