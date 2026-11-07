import '@tilcayo/styles/index.css'
import { FormField, PasswordInput } from '@tilcayo/ui'

export default function PasswordInputExample() {
  return <FormField label="Password" hint="Use at least 8 characters.">{props => <PasswordInput {...props} minLength={8} autoComplete="new-password" placeholder="Enter a password" />}</FormField>
}
