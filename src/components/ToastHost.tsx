import { useApp } from '../store/AppStore'
import { Icon } from './Icons'

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon">
            <Icon name={toast.tone === 'success' ? 'checkCircle' : toast.tone === 'error' ? 'alert' : 'sparkles'} size={17} />
          </span>
          <span className="toast-text">{toast.message}</span>
          <button type="button" className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="关闭提示">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
