import { useState, type ReactNode, type MouseEvent } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  /** The always-visible summary line. */
  summary: ReactNode;
  /** Optional leading icon shown before the summary. */
  icon?: ReactNode;
  /** Body, revealed when open. */
  children: ReactNode;
  /** Expanded on first render when no persisted state exists. */
  defaultOpen?: boolean;
  /** localStorage key; when set, the open/closed choice is remembered. */
  persistKey?: string;
  /** `info` tints the panel moss for trust-bearing content; `plain` is neutral. */
  variant?: 'plain' | 'info';
}

/**
 * Accessible collapsible built on native <details>/<summary> so it is
 * keyboard-operable and screen-reader-friendly by default. The open state is
 * driven from React (summary click is intercepted) to avoid the controlled-
 * <details> double-toggle race, and optionally mirrored to localStorage.
 */
export default function Disclosure({
  summary,
  icon,
  children,
  defaultOpen = false,
  persistKey,
  variant = 'plain',
}: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (persistKey) {
      const saved = localStorage.getItem(persistKey);
      if (saved !== null) return saved === '1';
    }
    return defaultOpen;
  });

  function toggle(e: MouseEvent<HTMLElement>) {
    e.preventDefault(); // drive open state ourselves, not the native toggle
    setOpen(prev => {
      const next = !prev;
      if (persistKey) localStorage.setItem(persistKey, next ? '1' : '0');
      return next;
    });
  }

  return (
    <details className={`disclosure${variant === 'info' ? ' disclosure-info' : ''}`} open={open}>
      <summary className="disclosure-summary" onClick={toggle}>
        {icon && <span className="disclosure-icon" aria-hidden="true">{icon}</span>}
        <span>{summary}</span>
        <ChevronDown className="disclosure-chev" size={16} aria-hidden="true" />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
