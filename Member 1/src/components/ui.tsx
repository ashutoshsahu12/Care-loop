import { useState } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Avatar({ initials, size = "md", tone = "" }: { initials: string; size?: "sm" | "md" | "lg"; tone?: string }) {
  return <span className={`avatar avatar-${size} ${tone}`}>{initials}</span>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="page-header-action">{action}</div>}
  </div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon">✳</span><strong>{title}</strong><p>{description}</p></div>;
}

export function Modal({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const [closing, setClosing] = useState(false);
  const close = () => { if (!closing) { setClosing(true); onClose(); } };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={`modal ${wide ? "modal-wide" : ""}`}>
      <div className="modal-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-btn" onClick={close} aria-label="Close dialog"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

export function LoadingState() {
  return <div className="loading-state"><span className="spinner" /> Loading CARELOOP data…</div>;
}

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <div className="error-state"><strong>We couldn’t load this information</strong><p>{error}</p><button className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button></div>;
}
