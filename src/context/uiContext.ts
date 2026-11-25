import { createContext, useContext } from 'react'
import type { AttachmentMeta } from '../types'

export interface TaskEditorOptions {
  id?: string
  startDate?: string
  dueDate?: string
}

export interface NoteEditorOptions {
  id?: string
  date?: string
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export interface UIContextValue {
  route: string
  navigate: (path: string) => void
  openTaskEditor: (options?: TaskEditorOptions) => void
  openNoteEditor: (options?: NoteEditorOptions) => void
  previewAttachment: (attachment: AttachmentMeta) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  openShortcuts: () => void
}

export const UIContext = createContext<UIContextValue | null>(null)

export function useUI(): UIContextValue {
  const value = useContext(UIContext)
  if (!value) throw new Error('useUI 必须在 UIProvider 内使用')
  return value
}
