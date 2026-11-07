import { useState } from 'react'
import { FileUpload } from '@tilcayo/ui'
import { useAuth } from '../app/auth'

export function ProfilePhoto() {
  const { user, uploadAvatar, removeAvatar } = useAuth()
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  return <div className="profile-photo-settings">
    <div className="profile-photo-heading"><div><strong>Profile photo</strong><p>JPG, PNG or WebP · Up to 2 MB</p></div><button className="tl-btn tl-btn-outline" type="button" onClick={() => { setEditing(!editing); setError('') }} aria-expanded={editing}>{editing ? 'Close' : 'Change photo'}</button></div>
    {editing && <FileUpload label="Choose your profile photo" description="JPG, PNG or WebP · Up to 2 MB" onUpload={async (file, options) => { await uploadAvatar(file, options) }} />}
    {user?.avatarUrl && <button type="button" className="tl-btn tl-btn-ghost" disabled={removing} onClick={async () => { setRemoving(true); setError(''); try { await removeAvatar() } catch { setError('Could not remove your photo. Try again.') } finally { setRemoving(false) } }}>{removing ? 'Removing…' : 'Remove photo'}</button>}
    {error && <p role="alert">{error}</p>}
  </div>
}
