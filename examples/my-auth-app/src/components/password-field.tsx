import { useState } from 'react'

type PasswordFieldProps = {
  name: string
  label: string
  autoComplete: 'new-password' | 'current-password'
  placeholder?: string
}

export function PasswordField({ name, label, autoComplete, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="tl-form-group">
      <label className="tl-label" htmlFor={name}>{label}</label>
      <div className="auth-password">
        <input className="tl-input" id={name} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} required minLength={8} maxLength={72} />
        <button className="auth-password-toggle" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-controls={name} onClick={() => setVisible(!visible)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  )
}
