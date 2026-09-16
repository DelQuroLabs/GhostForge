import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Button({ children, onClick, to, variant = 'primary', disabled, small, type, title }: {
  children: ReactNode; onClick?: (e: MouseEvent) => void; to?: string; variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  disabled?: boolean; small?: boolean; type?: 'button' | 'submit'; title?: string;
}) {
  const cls = `btn ${variant} ${small ? 'btn-sm' : ''}`;
  if (to) return <Link to={to} className={cls} aria-disabled={disabled}>{children}</Link>;
  return <button type={type ?? 'button'} className={cls} onClick={onClick} disabled={disabled} title={title}>{children}</button>;
}

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`card ${className}`}>{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = 'dim', title }: { children: ReactNode; tone?: 'dim' | 'gold' | 'green' | 'red' | 'blue'; title?: string }) {
  return <span className={`badge ${tone}`} title={title}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Forging…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function Progress({ pct }: { pct: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onPick }: { tabs: Array<{ id: string; label: string; count?: number }>; active: string; onPick: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={`tab ${active === t.id ? 'active' : ''}`} onClick={() => onPick(t.id)}>
          {t.label}{t.count !== undefined ? <span className="tab-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
