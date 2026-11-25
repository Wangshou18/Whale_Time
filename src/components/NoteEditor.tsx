import { useRef, useState, type KeyboardEvent } from 'react'
import type { Note } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { parseTags } from '../utils/format'
import { renderMarkdown } from '../utils/markdown'
import { todayISO } from '../utils/date'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface Props {
  noteId?: string
  date?: string
  onClose: () => void
}

export function NoteEditor({ noteId, date, onClose }: Props) {
  const { notes, saveNote, deleteNote, notify } = useApp()
  const { confirm } = useUI()
  const existing = noteId ? notes.find((note) => note.id === noteId) : undefined
  const isNew = !existing

  const [draft, setDraft] = useState<Note>(() =>
    existing
      ? { ...existing }
      : {
          id: '',
          title: '',
          content: '',
          tags: [],
          date: date ?? null,
          createdAt: '',
          updatedAt: '',
        },
  )
  const [tagInput, setTagInput] = useState(existing?.tags.join('，') ?? '')
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const tags = parseTags(tagInput)

  const update = (patch: Partial<Note>) => setDraft((prev) => ({ ...prev, ...patch }))

  const insertMarkdown = (before: string, after = '', placeholder = '文本') => {
    const element = contentRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const selected = draft.content.slice(start, end) || placeholder
    const next = `${draft.content.slice(0, start)}${before}${selected}${after}${draft.content.slice(end)}`
    update({ content: next })
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const handleSave = async () => {
    if (!draft.title.trim() && !draft.content.trim()) {
      notify('标题和内容至少填写一项', 'error')
      return
    }
    setSaving(true)
    try {
      await saveNote({ ...draft, title: draft.title.trim() || '无标题笔记', tags })
      notify(isNew ? '笔记已创建' : '笔记已保存')
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存笔记失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    const ok = await confirm({
      title: '删除这篇笔记？',
      message: `「${existing.title}」将被永久删除，无法恢复。`,
      confirmText: '删除笔记',
      danger: true,
    })
    if (!ok) return
    setRemoving(true)
    try {
      await deleteNote(existing.id)
      notify('笔记已删除', 'info')
      onClose()
    } catch {
      notify('删除笔记失败', 'error')
    } finally {
      setRemoving(false)
    }
  }

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSave()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '新建笔记' : '编辑笔记'}
      subtitle={isNew ? '随手记下想法，Markdown 会让它更好看。' : `最后更新于 ${new Date(existing.updatedAt).toLocaleString('zh-CN')}`}
      size="lg"
      footer={
        <>
          <div className="modal-left">
            {existing ? (
              <button type="button" className="btn btn-danger-ghost" onClick={handleDelete} disabled={removing}>
                <Icon name="trash" size={16} />
                删除
              </button>
            ) : null}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner small" /> : <Icon name="check" size={16} />}
              {saving ? '保存中…' : isNew ? '创建笔记' : '保存笔记'}
            </button>
          </div>
        </>
      }
    >
      <div className="editor" onKeyDown={handleKey}>
        <input
          className="title-input"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="笔记标题"
          maxLength={120}
          autoFocus
        />

        <div className="field-grid">
          <label className="field">
            <span className="field-label">关联日期 <em>可选，方便在日历中回看</em></span>
            <input
              type="date"
              className="input"
              value={draft.date ?? ''}
              onChange={(event) => update({ date: event.target.value || null })}
            />
          </label>
          <label className="field">
            <span className="field-label">标签 <em>逗号分隔</em></span>
            <input
              className="input"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="例如：灵感，会议，读书"
            />
          </label>
        </div>
        {tags.length ? (
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="field">
          <div className="field-head">
            <span className="field-label">正文</span>
            <div className="segmented tiny">
              <button type="button" className={mode === 'write' ? 'active' : ''} onClick={() => setMode('write')}>
                编辑
              </button>
              <button type="button" className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
                预览
              </button>
            </div>
          </div>
          {mode === 'write' ? (
            <>
              <div className="md-toolbar">
                <button type="button" onClick={() => insertMarkdown('**', '**', '加粗文字')} title="加粗">B</button>
                <button type="button" onClick={() => insertMarkdown('*', '*', '斜体文字')} title="斜体"><em>I</em></button>
                <button type="button" onClick={() => insertMarkdown('## ', '', '小标题')} title="标题">H</button>
                <button type="button" onClick={() => insertMarkdown('- ', '', '列表项')} title="列表">≡</button>
                <button type="button" onClick={() => insertMarkdown('> ', '', '引用内容')} title="引用">❝</button>
                <button type="button" onClick={() => insertMarkdown('`', '`', '代码')} title="行内代码">&lt;/&gt;</button>
              </div>
              <textarea
                ref={contentRef}
                className="input textarea content-textarea tall"
                rows={13}
                value={draft.content}
                onChange={(event) => update({ content: event.target.value })}
                placeholder={'从这里开始记录…\n\n支持 # 标题、- 列表、**加粗**、`代码` 等 Markdown 语法。'}
              />
              <div className="field-foot">
                <span>{draft.content.length} 字符</span>
                <span>{draft.content.trim() ? `${draft.content.trim().split(/\s+/).length} 个词` : ''}</span>
              </div>
            </>
          ) : (
            <div className="markdown-body editor-preview">
              {draft.content.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.content) }} />
              ) : (
                <p className="muted">暂无内容。</p>
              )}
            </div>
          )}
        </div>
        {isNew ? (
          <p className="muted small">
            提示：关联日期后，笔记会出现在对应日期的日历详情中。今天日期为 {todayISO()}。
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
