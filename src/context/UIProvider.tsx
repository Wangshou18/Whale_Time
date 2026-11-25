import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AttachmentMeta } from '../types'
import { UIContext, type ConfirmOptions, type NoteEditorOptions, type TaskEditorOptions } from './uiContext'
import { TaskEditor } from '../components/TaskEditor'
import { NoteEditor } from '../components/NoteEditor'
import { AttachmentPreview } from '../components/AttachmentPreview'
import { Modal } from '../components/Modal'
import { Icon } from '../components/Icons'

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw || raw === '/') return '/dashboard'
  return raw
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<string>(readHash)
  const [taskOptions, setTaskOptions] = useState<TaskEditorOptions | null>(null)
  const [noteOptions, setNoteOptions] = useState<NoteEditorOptions | null>(null)
  const [preview, setPreview] = useState<AttachmentMeta | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const onHashChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route])

  const navigate = useCallback((path: string) => {
    const target = path.startsWith('/') ? path : `/${path}`
    if (readHash() === target) {
      setRoute(target)
      return
    }
    window.location.hash = target
  }, [])

  const openTaskEditor = useCallback((options: TaskEditorOptions = {}) => setTaskOptions(options), [])
  const openNoteEditor = useCallback((options: NoteEditorOptions = {}) => setNoteOptions(options), [])
  const previewAttachment = useCallback((attachment: AttachmentMeta) => setPreview(attachment), [])
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...options, resolve })
      }),
    [],
  )

  const settleConfirm = useCallback(
    (value: boolean) => {
      setConfirmState((state) => {
        state?.resolve(value)
        return null
      })
    },
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (taskOptions || noteOptions || preview || confirmState || shortcutsOpen) return

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault()
          openTaskEditor()
        } else if (event.key.toLowerCase() === 'm') {
          event.preventDefault()
          openNoteEditor()
        }
      }

      if (event.key === '?') {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [taskOptions, noteOptions, preview, confirmState, shortcutsOpen, openTaskEditor, openNoteEditor])

  const value = useMemo(
    () => ({ route, navigate, openTaskEditor, openNoteEditor, previewAttachment, confirm, openShortcuts }),
    [route, navigate, openTaskEditor, openNoteEditor, previewAttachment, confirm, openShortcuts],
  )

  return (
    <UIContext.Provider value={value}>
      {children}

      {taskOptions ? (
        <TaskEditor
          key={taskOptions.id ?? `new-${taskOptions.startDate ?? ''}-${taskOptions.dueDate ?? ''}`}
          taskId={taskOptions.id}
          startDate={taskOptions.startDate}
          dueDate={taskOptions.dueDate}
          onClose={() => setTaskOptions(null)}
        />
      ) : null}

      {noteOptions ? (
        <NoteEditor
          key={noteOptions.id ?? `new-${noteOptions.date ?? ''}`}
          noteId={noteOptions.id}
          date={noteOptions.date}
          onClose={() => setNoteOptions(null)}
        />
      ) : null}

      <AttachmentPreview attachment={preview} onClose={() => setPreview(null)} />

      <Modal
        open={!!confirmState}
        onClose={() => settleConfirm(false)}
        title={confirmState?.title ?? ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => settleConfirm(false)}>
              {confirmState?.cancelText ?? '取消'}
            </button>
            <button
              type="button"
              className={`btn ${confirmState?.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => settleConfirm(true)}
            >
              {confirmState?.confirmText ?? '确定'}
            </button>
          </>
        }
      >
        <p className="confirm-text">{confirmState?.message}</p>
      </Modal>

      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="键盘快捷键"
        subtitle="不离开键盘，也能快速处理日常事务。"
        size="sm"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setShortcutsOpen(false)}>
            知道了
          </button>
        }
      >
        <div className="shortcut-list">
          {[
            ['Alt', 'N', '新建任务'],
            ['Alt', 'M', '新建笔记'],
            ['Ctrl / ⌘', 'Enter', '在编辑器中保存'],
            ['?', '', '打开快捷键面板'],
            ['Esc', '', '关闭当前弹窗'],
          ].map(([key, second, label]) => (
            <div className="shortcut-row" key={label}>
              <span>{label}</span>
              <span className="keys">
                <kbd>{key}</kbd>
                {second ? <kbd>{second}</kbd> : null}
              </span>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>
          <Icon name="shield" size={13} /> 快捷键不会误触输入框；所有操作都在本地完成。
        </p>
      </Modal>
    </UIContext.Provider>
  )
}
