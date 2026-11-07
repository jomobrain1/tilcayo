import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Alert, Button, Card, Modal } from './index.js';

export function IconButton({ label, children, ...props }: ComponentPropsWithoutRef<typeof Button> & { label: string }) {
  return <Button {...props} aria-label={label} title={label} className={['tl-icon-button', props.className].filter(Boolean).join(' ')}>{children}</Button>;
}
export function LoadingButton({ loading, loadingText = 'Loading...', children, disabled, ...props }: ComponentPropsWithoutRef<typeof Button> & { loading: boolean; loadingText?: string }) {
  return <Button {...props} disabled={disabled || loading} aria-busy={loading}>{loading && <span className="tl-spinner" aria-hidden="true" />}{loading ? loadingText : children}</Button>;
}
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentPropsWithoutRef<'input'>, 'type'>>(function PasswordInput({ id, className, disabled, ...props }, ref) {
  const generated = useId(), fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);
  return <div className="tl-password-input"><input {...props} ref={ref} id={fieldId} disabled={disabled} type={visible ? 'text' : 'password'} className={['tl-input', className].filter(Boolean).join(' ')} /><button type="button" disabled={disabled} aria-label={visible ? 'Hide password' : 'Show password'} aria-controls={fieldId} aria-pressed={visible} onClick={() => setVisible(!visible)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg></button></div>;
});
export const Checkbox = forwardRef<HTMLInputElement, Omit<ComponentPropsWithoutRef<'input'>, 'type'> & { label: ReactNode }>(function Checkbox({ label, className, ...props }, ref) {
  return <label className="tl-choice"><input {...props} ref={ref} type="checkbox" className={['tl-checkbox', className].filter(Boolean).join(' ')} /><span>{label}</span></label>;
});
export function RadioGroup({ label, name, value, onChange, options, disabled = false }: { label: string; name?: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string; disabled?: boolean }[]; disabled?: boolean }) {
  const generated = useId();
  return <fieldset className="tl-radio-group" disabled={disabled}><legend>{label}</legend>{options.map(option => <label className="tl-choice" key={option.value}><input type="radio" className="tl-radio" name={name ?? generated} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)} /><span>{option.label}</span></label>)}</fieldset>;
}
export function Switch({ label, checked, defaultChecked = false, onCheckedChange, disabled = false }: { label: string; checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }) {
  const [internal, setInternal] = useState(defaultChecked);
  const enabled = checked ?? internal;
  return <button className="tl-switch" type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={() => { if (checked === undefined) setInternal(!enabled); onCheckedChange?.(!enabled); }}><span className="tl-switch-track" aria-hidden="true"><span /></span><span>{label}</span></button>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="tl-empty-state"><span className="tl-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h7l2 3h9v10H3Zm0 0V4h8l2 3h8v3" /></svg></span><h3>{title}</h3><p>{description}</p>{action}</section>;
}
export function StatCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return <Card className="tl-stat-card"><h3>{label}</h3><strong>{value}</strong>{note && <p>{note}</p>}</Card>;
}
export function Divider() { return <hr className="tl-divider" />; }

interface Tab { id: string; label: string; content: ReactNode; disabled?: boolean }
export function Tabs({ label, tabs, value, defaultValue, onValueChange }: { label: string; tabs: readonly Tab[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const id = useId(), list = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState(defaultValue ?? tabs.find(tab => !tab.disabled)?.id);
  const selected = value ?? internal;
  const activate = (next: string) => { if (value === undefined) setInternal(next); onValueChange?.(next); };
  return <div className="tl-tabs"><div className="tl-tab-list" role="tablist" aria-label={label} ref={list} onKeyDown={event => {
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index - 1 + buttons.length) % buttons.length : -1;
    if (next >= 0 && buttons[next]) { event.preventDefault(); buttons[next].focus(); buttons[next].click(); }
  }}>{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" disabled={tab.disabled} id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === tab.id} tabIndex={selected === tab.id ? 0 : -1} onClick={() => activate(tab.id)}>{tab.label}</button>)}</div>{tabs.map((tab, index) => <div key={tab.id} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== tab.id} tabIndex={0}>{tab.content}</div>)}</div>;
}
export function Breadcrumbs({ items, label = 'Breadcrumbs' }: { items: readonly { label: string; href?: string }[]; label?: string }) {
  return <nav className="tl-breadcrumbs" aria-label={label}><ol>{items.map((item, index) => <li key={index}>{index > 0 && <span aria-hidden="true">/</span>}{item.href && index !== items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}
interface MenuItem { label: string; href?: string; onSelect?: () => void; disabled?: boolean; danger?: boolean }
export function DropdownMenu({ label, items }: { label: string; items: readonly MenuItem[] }) {
  const [open, setOpen] = useState(false), id = useId();
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className="tl-dropdown" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Button ref={trigger} variant="outline" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}>{label}<span aria-hidden="true">⌄</span></Button>
    {open && <div className="tl-dropdown-menu" role="menu" aria-label={label} id={id} ref={menu} onKeyDown={event => {
      if (event.key === 'Tab') { setOpen(false); trigger.current?.focus(); return; }
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      const buttons = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : -1;
      if (next >= 0 && buttons[next]) { event.preventDefault(); buttons[next].focus(); }
    }}>{items.map((item, index) => item.href && !item.disabled ? <a key={index} href={item.href} role="menuitem" tabIndex={-1} className={item.danger ? 'tl-menu-danger' : undefined} onClick={close}>{item.label}</a> : <button key={index} type="button" role="menuitem" tabIndex={-1} disabled={item.disabled} className={item.danger ? 'tl-menu-danger' : undefined} onClick={() => { close(); item.onSelect?.(); }}>{item.label}</button>)}</div>}
  </div>;
}

export function ConfirmDialog({ open, title, message, onConfirm, onClose, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }: { open: boolean; title: string; message: ReactNode; onConfirm: () => void | Promise<void>; onClose: () => void; confirmText?: string; cancelText?: string; destructive?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (open) setError(''); }, [open]);
  return <Modal open={open} title={title} onClose={() => { if (!busy) onClose(); }}><p>{message}</p>{error && <Alert variant="danger">{error}</Alert>}<div className="tl-flex tl-flex-wrap tl-gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>{cancelText}</Button><LoadingButton loading={busy} loadingText="Working..." variant={destructive ? 'danger' : 'primary'} onClick={async () => { setBusy(true); setError(''); try { await onConfirm(); onClose(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to complete this action.'); } finally { setBusy(false); } }}>{confirmText}</LoadingButton></div></Modal>;
}

type ToastInput = { message: string; variant?: 'success' | 'info' | 'warning' | 'danger' };
const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);
function ToastMessage({ toast, onClose, duration }: { toast: ToastInput & { id: number }; onClose: (id: number) => void; duration: number }) {
  useEffect(() => { if (duration <= 0) return; const timer = setTimeout(() => onClose(toast.id), duration); return () => clearTimeout(timer); }, [toast.id, duration, onClose]);
  return <div className={`tl-toast tl-toast-${toast.variant ?? 'info'}`} role={toast.variant === 'danger' ? 'alert' : 'status'}><span>{toast.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => onClose(toast.id)}>×</button></div>;
}
export function ToastProvider({ children, duration = 4000 }: { children: ReactNode; duration?: number }) {
  const [toasts, setToasts] = useState<(ToastInput & { id: number })[]>([]), next = useRef(0);
  const dismiss = useCallback((id: number) => setToasts(items => items.filter(item => item.id !== id)), []);
  const notify = useCallback((toast: ToastInput) => { const id = ++next.current; setToasts(items => [...items.slice(-2), { ...toast, id }]); }, []);
  const context = useMemo(() => notify, [notify]);
  return <ToastContext.Provider value={context}>{children}<div className="tl-toast-region" role="region" aria-label="Toast notifications">{toasts.map(toast => <ToastMessage key={toast.id} toast={toast} onClose={dismiss} duration={duration} />)}</div></ToastContext.Provider>;
}
export function useToast() { const notify = useContext(ToastContext); if (!notify) throw new Error('useToast requires ToastProvider'); return notify; }
