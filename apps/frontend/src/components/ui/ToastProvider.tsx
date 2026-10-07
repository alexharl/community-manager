import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { ToastContext, type ToastApi, type ToastTone } from './toast-context';
import styles from './Toast.module.css';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
// Fehler bleiben länger stehen, damit man sie lesen kann
const DURATION_MS: Record<ToastTone, number> = { success: 4000, info: 4000, error: 7000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), DURATION_MS[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} className={cx(styles.toast, styles[toast.tone])}>
              <Icon className={styles.icon} aria-hidden />
              <span className={styles.message}>{toast.message}</span>
              <button
                type="button"
                className={styles.close}
                aria-label="Meldung schließen"
                onClick={() => dismiss(toast.id)}
              >
                <X aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
