import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../app/auth'
import { PasswordField } from '../components/password-field'
import { authErrorMessage } from '../lib/auth-feedback'
import { toast } from '../lib/toast'

export function ForgotPasswordPage() {
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    setError('')
    setPending(true)
    try {
      if (step === 'email') {
        const address = String(data.get('email') ?? '').trim().toLowerCase()
        const response = await forgotPassword({ email: address })
        setEmail(address)
        setMessage(response.message)
        setStep('code')
      } else if (step === 'code') {
        const response = await verifyResetCode({ email, code: String(data.get('code') ?? '').trim() })
        setResetToken(response.data.resetToken)
        setMessage('Choose your new password.')
        setStep('password')
      } else {
        const password = String(data.get('password') ?? '')
        if (password !== data.get('confirmPassword')) {
          setError('Passwords do not match.')
          return
        }
        const response = await resetPassword({ resetToken, password })
        setResetToken('')
        toast.success(response.message)
        navigate('/login', { replace: true })
      }
    } catch (failure) { setError(authErrorMessage(failure)) }
    finally { setPending(false) }
  }

  return (
    <section className="auth-panel tl-card tl-stack" aria-labelledby="reset-title">
      <header className="auth-heading">
        <h1 id="reset-title" className="tl-heading-2">{step === 'email' ? 'Forgot password?' : step === 'code' ? 'Check your email' : 'Reset your password'}</h1>
        <p className="tl-text-muted">{step === 'email' ? 'Enter your email to receive a reset code.' : message}</p>
      </header>
      <form onSubmit={submit} aria-busy={pending} className="tl-stack">
        {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
        <fieldset disabled={pending} className="auth-fields tl-stack">
          {step === 'email' && <div className="tl-form-group">
            <label className="tl-label" htmlFor="reset-email">Email</label>
            <input className="tl-input" id="reset-email" name="email" type="email" autoComplete="email" defaultValue={email} required maxLength={254} />
          </div>}
          {step === 'code' && <div className="tl-form-group">
            <label className="tl-label" htmlFor="reset-code">Six-digit code</label>
            <input className="tl-input" id="reset-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
            <p className="tl-text-muted">The code expires in 10 minutes. You have five attempts. Wait 60 seconds before requesting another code.</p>
          </div>}
          {step === 'password' && <>
            <PasswordField name="password" label="New password" autoComplete="new-password" />
            <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" />
          </>}
          <button className="tl-btn tl-btn-primary auth-submit" type="submit">{pending ? 'Please wait...' : step === 'email' ? 'Send reset code' : step === 'code' ? 'Verify code' : 'Reset password'}</button>
          {step !== 'email' && <button className="tl-btn" type="button" onClick={() => { setStep('email'); setResetToken(''); setError(''); setMessage('') }}>Request a new code</button>}
        </fieldset>
      </form>
      <p className="auth-footer tl-text-muted"><Link to="/login">Back to login</Link></p>
    </section>
  )
}
