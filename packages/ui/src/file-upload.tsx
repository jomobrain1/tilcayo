import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface FileUploadProps {
  accept?: string;
  maxBytes?: number;
  label?: string;
  description?: string;
  onUpload: (file: File, options: { signal: AbortSignal; onProgress: (percent: number) => void }) => Promise<unknown>;
  children?: ReactNode;
}

/** Accessible single-file picker with drop support and abortable upload lifecycle. */
export function FileUpload({ accept = 'image/jpeg,image/png,image/webp', maxBytes = 2 * 1024 * 1024, label = 'Upload a file', description, onUpload, children }: FileUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!file?.type.startsWith('image/') || file.type === 'image/svg+xml') { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function select(files: FileList | File[]) {
    if (state === 'uploading') return;
    setMessage(''); setState('idle'); setFile(null); setProgress(0);
    if (files.length !== 1) { setMessage('Choose one file at a time.'); setState('error'); return; }
    const selected = files[0];
    const allowed = accept.split(',').map(value => value.trim().toLowerCase());
    const matches = !accept || allowed.some(value => value.startsWith('.') ? selected.name.toLowerCase().endsWith(value) : value.endsWith('/*') ? selected.type.startsWith(value.slice(0, -1)) : selected.type === value);
    if (!matches) { setMessage('This file type is not supported.'); setState('error'); return; }
    if (!selected.size || selected.size > maxBytes) { setMessage(`Choose a non-empty file up to ${Math.ceil(maxBytes / 1048576)} MB.`); setState('error'); return; }
    setFile(selected);
  }
  async function upload() {
    if (!file || state === 'uploading') return;
    const active = new AbortController(); controller.current = active;
    setState('uploading'); setMessage(''); setProgress(0);
    try {
      await onUpload(file, { signal: active.signal, onProgress: value => { if (!active.signal.aborted) setProgress(Math.max(0, Math.min(100, value))); } });
      if (!active.signal.aborted) { setState('done'); setProgress(100); setMessage('Upload complete.'); }
    } catch (error) {
      if (!active.signal.aborted) {
        const detail = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Upload failed. Try again.';
        setState('error'); setMessage(detail);
      }
    }
  }
  return <section className="tl-file-upload" aria-label={label} aria-busy={state === 'uploading'}>
    <div className={`tl-file-drop${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></svg>
      <strong>{label}</strong><span>Drag and drop, or choose a file</span>
      <input ref={input} id={id} className="tl-file-input" type="file" accept={accept} disabled={state === 'uploading'} aria-label={label} aria-describedby={`${id}-help`} onChange={event => { if (event.target.files?.length) select(event.target.files); event.target.value = ''; }} />
      <button type="button" className="tl-btn tl-btn-outline" disabled={state === 'uploading'} onClick={() => input.current?.click()}>Choose file</button>
      <small id={`${id}-help`}>{description ?? `Maximum ${Math.ceil(maxBytes / 1048576)} MB`}</small>
    </div>
    {file && <div className="tl-file-selection">{preview && <img src={preview} alt="Selected file preview" />}<div><strong>{file.name}</strong><small>{Math.max(1, Math.ceil(file.size / 1024))} KB</small></div>{state !== 'uploading' && <button type="button" className="tl-btn tl-btn-ghost" aria-label="Clear selected file" onClick={() => { setFile(null); setState('idle'); setMessage(''); }}>×</button>}</div>}
    {state === 'uploading' && <progress aria-label="Upload progress" value={progress} max="100" />}
    {message && <p className={state === 'error' ? 'tl-file-error' : 'tl-file-feedback'} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
    {file && state !== 'done' && <div className="tl-file-actions">{state === 'uploading' ? <button type="button" className="tl-btn tl-btn-outline" onClick={() => { controller.current?.abort(); setState('idle'); setMessage('Upload cancelled.'); }}>Cancel</button> : <button type="button" className="tl-btn tl-btn-primary" onClick={() => void upload()}>{state === 'error' ? 'Retry upload' : 'Upload file'}</button>}</div>}
    {children}
  </section>;
}
