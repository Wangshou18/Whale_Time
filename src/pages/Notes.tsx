import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { Icon } from '../components/Icons'
import { excerpt } from '../utils/markdown'
import { formatShort, relativeTime } from '../utils/date'

type SortKey = 'updated' | 'created' | 'title'

export function NotesPage() {
  const { notes, deleteNote, notify } = useApp()
  const { openNoteEditor, confirm } = useUI()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState<SortKey>('updated')

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((note) => note.tags.forEach((item) => set.add(item)))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [notes])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return notes
      .filter((note) => {
        if (tag !== 'all' && !note.tags.includes(tag)) return false
        if (!keyword) return true
        return `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(keyword)
      })
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
        if (sort === 'created') return b.createdAt.localeCompare(a.createdAt)
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [notes, query, tag, sort])

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: '删除这篇笔记？',
      message: `「${title}」将被永久删除，无法恢复。`,
      confirmText: '删除笔记',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteNote(id)
      notify('笔记已删除', 'info')
    } catch {
      notify('删除笔记失败', 'error')
    }
  }

  const datedCount = notes.filter((note) => note.date).length
  const hasFilter = !!query || tag !== 'all'

  return (
    <div className="notes-page">
      <div className="page-bar">
        <div className="notes-summary">
          <span><strong>{notes.length}</strong> 篇笔记</span>
          <span className="dot-sep" />
          <span><strong>{datedCount}</strong> 篇关联日期</span>
          <span className="dot-sep" />
          <span><strong>{tagOptions.length}</strong> 个标签</span>
        </div>
      </div>

      <section className="filter-bar">
        <div className="search-input">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、正文或标签…"
            aria-label="搜索笔记"
          />
        </div>
        <select className="input select-sm" value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="all">全部标签</option>
          {tagOptions.map((item) => (
            <option key={item} value={item}>
              #{item}
            </option>
          ))}
        </select>
        <select className="input select-sm" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="updated">最近更新</option>
          <option value="created">最近创建</option>
          <option value="title">按标题</option>
        </select>
        {hasFilter ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setTag('all') }}>
            清除筛选
          </button>
        ) : null}
        <button type="button" className="btn btn-primary btn-sm filter-new" onClick={() => openNoteEditor()}>
          <Icon name="notePlus" size={15} /> 新建笔记
        </button>
      </section>

      {filtered.length ? (
        <div className="note-grid">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="note-card"
              role="button"
              tabIndex={0}
              onClick={() => openNoteEditor({ id: note.id })}
              onKeyDown={(event) => event.key === 'Enter' && openNoteEditor({ id: note.id })}
            >
              <div className="note-card-top">
                {note.date ? (
                  <span className="note-date"><Icon name="calendar" size={12} /> {formatShort(note.date)}</span>
                ) : (
                  <span className="note-date muted">未关联日期</span>
                )}
                <button
                  type="button"
                  className="mini-btn danger"
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleDelete(note.id, note.title)
                  }}
                  title="删除笔记"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
              <h3>{note.title}</h3>
              <p>{excerpt(note.content, 150) || '空白笔记'}</p>
              <div className="note-card-foot">
                <span className="note-tags">
                  {note.tags.length ? note.tags.slice(0, 3).map((item) => <span key={item} className="tag small">#{item}</span>) : <span className="muted small">无标签</span>}
                </span>
                <span className="note-time">{relativeTime(note.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name={hasFilter ? 'filter' : 'notes'} size={24} /></div>
            <h4>{hasFilter ? '没有匹配的笔记' : '还没有笔记'}</h4>
            <p>{hasFilter ? '换个关键词或标签再找找。' : '把想法、会议记录、灵感碎片留在这里，随时都能找回来。'}</p>
            {hasFilter ? (
              <button type="button" className="btn btn-soft" onClick={() => { setQuery(''); setTag('all') }}>
                清除筛选
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => openNoteEditor()}>
                <Icon name="notePlus" size={15} /> 写下第一篇
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
