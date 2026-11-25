import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { Priority, Task } from '../types'
import { PRIORITY_META, PRIORITY_OPTIONS } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { parseTags, formatBytes, downloadBlob } from '../utils/format'
import { renderMarkdown } from '../utils/markdown'
import { todayISO } from '../utils/date'
import { Icon } from './Icons'
import { Modal } from './Modal'

interface Props {
  taskId?: string
  startDate?: string
  dueDate?: string
  onClose: () => void
}

const MAX_FILE = 50 * 1024 * 1024

export function TaskEditor({ taskId, startDate, dueDate, onClose }: Props) {
  const { tasks, saveTask, notify, getAttachmentBlob } = useApp()
  const { previewAttachment } = useUI()
  const existing = taskId ? tasks.find((task) => task.id === taskId) : undefined
  const isNew = !existing

  const [draft, setDraft] = useState<Task>(() => {
    if (existing) return { ...existing, attachments: [...existing.attachments] }
    return {
      id: '',
      title: '',
      content: '',
      startDate: startDate ?? todayISO(),
      dueDate: dueDate ?? null,
      priority: 'medium',
      tags: [],
      status: 'todo',
      completedAt: null,
      attachments: [],
      createdAt: '',
      updatedAt: '',
    }
  })
  const [tagInput, setTagInput] = useState(existing?.tags.join('，') ?? '')
  const [pending, setPending] = useState<File[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const update = (patch: Partial<Task>) => setDraft((prev) => ({ ...prev, ...patch }))
  const tags = parseTags(tagInput)

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!picked.length) return
    const tooLarge = picked.filter((file) => file.size > MAX_FILE)
    if (tooLarge.length) {
      notify(`「${tooLarge[0].name}」超过 50MB，未添加`, 'error')
    }
    const accepted = picked.filter((file) => file.size <= MAX_FILE)
    if (accepted.length) setPending((prev) => [...prev, ...accepted])
    if (accepted.length) notify(`已添加 ${accepted.length} 个附件，保存任务后写入本地`, 'info')
  }

  const insertMarkdown = (before: string, after = '', placeholder = '文本') => {
    const element = contentRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const current = draft.content
    const selected = current.slice(start, end) || placeholder
    const next = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`
    update({ content: next })
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const handleSubmit = async () => {
    if (!draft.title.trim()) {
      notify('请先填写任务标题', 'error')
      return
    }
    if (!draft.startDate) {
      notify('请选择起始日期', 'error')
      return
    }
    if (draft.dueDate && draft.dueDate < draft.startDate) {
      notify('截止日期不能早于起始日期', 'error')
      return
    }
    setSaving(true)
    try {
      await saveTask({ ...draft, tags }, pending, Array.from(removed))
      notify(isNew ? '任务已创建' : '任务已更新')
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存任务失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '新建任务' : '编辑任务'}
      subtitle={isNew ? '把要做的事情写下来，剩下的交给时间。' : '修改后保存，进度会同步到仪表盘与日历。'}
      size="lg"
      footer={
        <>
          <span className="modal-hint">Ctrl / ⌘ + Enter 保存</span>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <span className="spinner small" /> : <Icon name="check" size={16} />}
              {saving ? '保存中…' : isNew ? '创建任务' : '保存修改'}
            </button>
          </div>
        </>
      }
    >
      <div onKeyDown={handleEnter} className="editor">
        <input
          className="title-input"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="任务标题"
          maxLength={120}
          autoFocus
        />

        <div className="field-grid three">
          <label className="field">
            <span className="field-label">起始日期</span>
            <input
              type="date"
              className="input"
              value={draft.startDate}
              onChange={(event) => update({ startDate: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">截止日期 <em>可选</em></span>
            <input
              type="date"
              className="input"
              value={draft.dueDate ?? ''}
              onChange={(event) => update({ dueDate: event.target.value || null })}
            />
          </label>
          <label className="field">
            <span className="field-label">优先级</span>
            <select
              className="input"
              value={draft.priority}
              onChange={(event) => update({ priority: event.target.value as Priority })}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">标签 <em>用逗号或空格分隔，最多 8 个</em></span>
          <input
            className="input"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="例如：工作，复盘，本周"
          />
        </label>
        {tags.length ? (
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="field">
          <div className="field-head">
            <span className="field-label">任务内容 <em>支持 Markdown</em></span>
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
                <button type="button" onClick={() => insertMarkdown('[', '](https://)', '链接文字')} title="链接">↗</button>
                <button type="button" onClick={() => insertMarkdown('`', '`', '代码')} title="行内代码">&lt;/&gt;</button>
              </div>
              <textarea
                ref={contentRef}
                className="input textarea content-textarea"
                rows={9}
                value={draft.content}
                onChange={(event) => update({ content: event.target.value })}
                placeholder="补充任务细节、执行步骤或参考信息…"
              />
            </>
          ) : (
            <div className="markdown-body editor-preview">
              {draft.content.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.content) }} />
              ) : (
                <p className="muted">暂无内容，切换到「编辑」开始书写。</p>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <div className="field-head">
            <span className="field-label">附件 <em>存入浏览器本地，单个不超过 50MB</em></span>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()}>
              <Icon name="paperclip" size={15} />
              添加附件
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={handleFiles} />
          </div>
          {draft.attachments.filter((meta) => !removed.has(meta.id)).length === 0 && pending.length === 0 ? (
            <p className="muted small">暂无附件，点击右上角「添加附件」上传。</p>
          ) : null}
          <ul className="attachment-list">
            {draft.attachments
              .filter((meta) => !removed.has(meta.id))
              .map((meta) => (
                <li key={meta.id} className="attachment-item">
                  <span className="attachment-icon">
                    <Icon name={meta.type.startsWith('image/') ? 'image' : 'file'} size={17} />
                  </span>
                  <span className="attachment-info">
                    <strong>{meta.name}</strong>
                    <span>{formatBytes(meta.size)}</span>
                  </span>
                  <button type="button" className="mini-btn" onClick={() => previewAttachment(meta)} title="预览">
                    <Icon name="eye" size={15} />
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    title="下载"
                    onClick={async () => {
                      const blob = await getAttachmentBlob(meta.id)
                      if (!blob) {
                        notify('附件数据缺失，无法下载', 'error')
                        return
                      }
                      downloadBlob(blob, meta.name)
                    }}
                  >
                    <Icon name="download" size={15} />
                  </button>
                  <button
                    type="button"
                    className="mini-btn danger"
                    onClick={() => setRemoved((prev) => new Set(prev).add(meta.id))}
                    title="移除"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </li>
              ))}
            {pending.map((file, index) => (
              <li key={`${file.name}-${index}`} className="attachment-item pending">
                <span className="attachment-icon">
                  <Icon name={file.type.startsWith('image/') ? 'image' : 'file'} size={17} />
                </span>
                <span className="attachment-info">
                  <strong>{file.name}</strong>
                  <span>{formatBytes(file.size)} · 待保存</span>
                </span>
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => setPending((prev) => prev.filter((_, i) => i !== index))}
                  title="取消添加"
                >
                  <Icon name="close" size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
