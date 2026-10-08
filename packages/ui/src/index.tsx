import { forwardRef, useEffect, useId, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

const classes = (...values: (string | undefined)[]) => values.filter(Boolean).join(" ");
type ButtonProps = ComponentPropsWithoutRef<"button"> & { variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", className, type = "button", ...props }, ref) {
  return <button {...props} ref={ref} type={type} className={classes("tl-btn", `tl-btn-${variant}`, className)} />;
});
export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function Input({ className, ...props }, ref) {
  return <input {...props} ref={ref} className={classes("tl-input", className)} />;
});
export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(function Select({ className, ...props }, ref) {
  return <select {...props} ref={ref} className={classes("tl-select", className)} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea {...props} ref={ref} className={classes("tl-textarea", className)} />;
});
export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={classes("tl-card", className)} />;
}
export function Alert({ variant = "info", className, role = "alert", ...props }: ComponentPropsWithoutRef<"div"> & { variant?: "info" | "success" | "warning" | "danger" }) {
  return <div {...props} role={role} className={classes("tl-alert", `tl-alert-${variant}`, className)} />;
}
export function Badge({ variant = "neutral", className, ...props }: ComponentPropsWithoutRef<"span"> & { variant?: "primary" | "success" | "warning" | "danger" | "neutral" }) {
  return <span {...props} className={classes("tl-badge", `tl-badge-${variant}`, className)} />;
}
export function Table({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return <div className="tl-table-wrapper"><table {...props} className={classes("tl-table", className)} /></div>;
}
export function Spinner({ label = "Loading..." }: { label?: string }) {
  return <span role="status" className="tl-flex tl-items-center"><span aria-hidden="true" className="tl-spinner" />{label}</span>;
}

interface FormFieldProps {
  label: ReactNode;
  id?: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
}
export function FormField({ label, id, hint, error, children }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  return <div className="tl-form-group">
    <label className="tl-label" htmlFor={fieldId}>{label}</label>
    {children({ id: fieldId, "aria-describedby": error || hint ? descriptionId : undefined, "aria-invalid": error ? true : undefined })}
    {(error || hint) && <p id={descriptionId} className={error ? "tl-form-error" : "tl-help-text"} role={error ? "alert" : undefined}>{error || hint}</p>}
  </div>;
}

interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode }
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  // Native dialog provides focus containment, Escape handling and focus restoration.
  return <dialog ref={ref} className="tl-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="tl-stack"><h2 id={titleId}>{title}</h2>{children}<Button variant="outline" onClick={onClose}>Close</Button></div>
  </dialog>;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const last = Math.max(1, totalPages);
  if (!Number.isInteger(page) || !Number.isInteger(totalPages) || page < 1 || totalPages < 0 || page > last) throw new Error("Invalid pagination values");
  return <nav aria-label="Pagination" className="tl-flex tl-items-center tl-flex-wrap">
    <Button variant="outline" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
    <span aria-live="polite">Page {page} of {last}</span>
    <Button variant="outline" disabled={page === last} onClick={() => onChange(page + 1)}>Next</Button>
  </nav>;
}
