import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  bodyClassName?: string
}

let modalSequence = 0
const modalStack: number[] = []
let scrollLocks = 0
let savedOverflow = ''

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', bodyClassName = '' }: ModalProps) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const token = ++modalSequence
    modalStack.push(token)
    if (scrollLocks === 0) {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    scrollLocks += 1

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (modalStack[modalStack.length - 1] !== token) return
      event.preventDefault()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = modalStack.lastIndexOf(token)
      if (index >= 0) modalStack.splice(index, 1)
      scrollLocks = Math.max(0, scrollLocks - 1)
      if (scrollLocks === 0) document.body.style.overflow = savedOverflow
    }
  }, [open])

  if (!open) return null

  // 挂到 body 上：页面容器带有入场动画（transform），会让 position: fixed 相对它定位
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className={`modal-body ${bodyClassName}`}>{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
