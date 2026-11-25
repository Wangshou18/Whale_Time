import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { Icon } from '../components/Icons'
import { SummaryExport } from '../components/SummaryExport'
import { excerpt } from '../utils/markdown'
import { formatDateCN, formatShort, fromISO, monthGrid, monthLabel, relativeTime, toISO, todayISO, weekdayShort } from '../utils/date'
import { countChars, monthBounds, summariesInRange, summaryStreak } from '../utils/summary'

const TEMPLATES: { key: string; label: string; text: string }[] = [
  { key: 'done', label: '今日完成', text: '### 今日完成\n\n- ' },
  { key: 'issue', label: '问题与收获', text: '### 问题与收获\n\n- ' },
  { key: 'plan', label: '明日计划', text: '### 明日计划\n\n- ' },
  { key: 'full', label: '三段式', text: '### 今日完成\n\n- \n\n### 问题与收获\n\n- \n\n### 明日计划\n\n- ' },
]

const WEEK_HEADS = ['一', '二', '三', '四', '五', '六', '日']

export function SummaryPage() {
  const { summaries, saveSummary, notify } = useApp()
  const { confirm } = useUI()
  const today = todayISO()
  const todayDate = fromISO(today)

  const initial = summaries.find((item) => item.id === today)
  const [selected, setSelected] = useState(today)
  const [anchor, setAnchor] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() })
  const [draft, setDraft] = useState(initial?.content ?? '')
  const [savedContent, setSavedContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const draftRef = useRef(draft)
  draftRef.current = draft

  const summaryMap = useMemo(() => new Map(summaries.map((item) => [item.id, item])), [summaries])
  const bounds = monthBounds(anchor.year, anchor.month)
  const monthEntries = useMemo(
    () => summariesInRange(summaries, bounds.from, bounds.to),
    [summaries, bounds.from, bounds.to],
  )
  const days = useMemo(() => monthGrid(anchor.year, anchor.month), [anchor])
  const streak = useMemo(() => summaryStreak(summaries, today), [summaries, today])
  const monthChars = monthEntries.reduce((sum, item) => sum + countChars(item.content), 0)

  const existing = summaryMap.get(selected)
  const dirty = draft.trim() !== savedContent.trim()
  const chars = countChars(draft)

  const persist = useCallback(
    async (date: string, content: string): Promise<boolean> => {
      setSaving(true)
      try {
        await saveSummary(date, content)
        if (selectedRef.current === date && draftRef.current === content) setSavedContent(content)
        return true
      } catch {
        notify('保存失败，请重试', 'error')
        return false
      } finally {
        setSaving(false)
      }
    },
    [saveSummary, notify],
  )

  useEffect(() => {
    if (!dirty) return
    const date = selected
    const content = draft
    const timer = window.setTimeout(() => {
      void persist(date, content)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [dirty, draft, selected, persist])

  // 离开页面时把未保存的草稿补写一次，避免切换路由丢内容
  const saveRef = useRef(saveSummary)
  saveRef.current = saveSummary
  const savedRef = useRef(savedContent)
  savedRef.current = savedContent
  useEffect(
    () => () => {
      if (draftRef.current.trim() !== savedRef.current.trim()) {
        void saveRef.current(selectedRef.current, draftRef.current)
      }
    },
    [],
  )

  const goTo = useCallback(
    (day: string) => {
      if (day === selected) return
      if (dirty) void persist(selected, draft)
      const item = summaryMap.get(day)
      setSelected(day)
      setDraft(item?.content ?? '')
      setSavedContent(item?.content ?? '')
      const date = fromISO(day)
      setAnchor({ year: date.getFullYear(), month: date.getMonth() })
    },
    [dirty, persist, selected, draft, summaryMap],
  )

  const shiftMonth = (delta: number) => {
    const base = new Date(anchor.year, anchor.month + delta, 1)
    const next = { year: base.getFullYear(), month: base.getMonth() }
    const isCurrent = next.year === todayDate.getFullYear() && next.month === todayDate.getMonth()
    goTo(isCurrent ? today : toISO(base))
  }

  const handleSave = () => {
    if (!dirty) {
      notify(!existing && !draft.trim() ? '还没有内容可保存' : '内容没有变化', 'info')
      return
    }
    void persist(selected, draft).then((ok) => {
      if (ok) notify(draft.trim() ? '总结已保存' : '已清空当天总结', 'info')
    })
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: '删除这天的总结？',
      message: `${formatDateCN(selected)} 的记录将被永久删除，无法恢复。`,
      confirmText: '删除总结',
      danger: true,
    })
    if (!ok) return
    try {
      await saveSummary(selected, '')
      setDraft('')
      setSavedContent('')
      notify('这天的总结已删除', 'info')
    } catch {
      notify('删除失败，请重试', 'error')
    }
  }

  const openExport = async () => {
    if (dirty) await persist(selected, draft)
    setExportOpen(true)
  }

  const insertTemplate = (text: string) => {
    const next = draft.trim() ? `${draft.replace(/\s+$/, '')}\n\n${text}` : text
    setDraft(next)
    window.requestAnimationFrame(() => {
      const node = editorRef.current
      if (!node) return
      node.focus()
      node.setSelectionRange(next.length, next.length)
    })
  }

  return (
    <div className="summary-page">
      <div className="page-bar rv-bar">
        <div className="range-nav">
          <button type="button" className="icon-btn bordered" onClick={() => shiftMonth(-1)} title="上一月">
            <Icon name="chevronLeft" size={16} />
          </button>
          <span className="range-label">{monthLabel(anchor.year, anchor.month)}</span>
          <button type="button" className="icon-btn bordered" onClick={() => shiftMonth(1)} title="下一月">
            <Icon name="chevronRight" size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo(today)}>
            回到今天
          </button>
        </div>

        <div className="rv-bar-stats">
          <span>
            本月已写 <strong>{monthEntries.length}</strong> 天
          </span>
          <span className="dot-sep" />
          <span>
            共 <strong>{monthChars.toLocaleString('zh-CN')}</strong> 字
          </span>
          <span className="dot-sep" />
          <span>
            连续 <strong>{streak}</strong> 天
          </span>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => void openExport()}>
            <Icon name="download" size={15} /> 导出
          </button>
        </div>
      </div>

      <div className="rv-layout">
        <aside className="card rv-side">
          <header className="section-head rv-side-head">
            <div>
              <h3>{monthLabel(anchor.year, anchor.month)}</h3>
              <p>点选日期，写当天的总结</p>
            </div>
            <span className="badge">{monthEntries.length}</span>
          </header>

          <div className="rv-cal-head">
            {WEEK_HEADS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="rv-cal-grid">
            {days.map((day) => {
              const date = fromISO(day)
              const inMonth = date.getMonth() === anchor.month
              const record = summaryMap.get(day)
              const has = !!record && !!record.content.trim()
              const classes = ['rv-day']
              if (!inMonth) classes.push('out')
              if (day === selected) classes.push('selected')
              if (day === today) classes.push('today')
              if (has) classes.push('has')
              return (
                <button key={day} type="button" className={classes.join(' ')} onClick={() => goTo(day)} title={formatDateCN(day)}>
                  <span>{date.getDate()}</span>
                  {has ? <i /> : null}
                </button>
              )
            })}
          </div>

          <div className="rv-cal-legend">
            <span className="rv-legend-dot" /> 已写总结
            <span className="dot-sep" />
            点击日期切换
          </div>

          <div className="rv-list-head">
            <span className="side-label">本月记录</span>
            <span className="muted small">{monthEntries.length} 天</span>
          </div>

          <div className="rv-list">
            {monthEntries.length ? (
              [...monthEntries].reverse().map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rv-entry ${item.date === selected ? 'active' : ''}`}
                  onClick={() => goTo(item.date)}
                >
                  <span className="rv-entry-date">
                    <strong>{formatShort(item.date)}</strong>
                    <em>{weekdayShort(item.date)}</em>
                  </span>
                  <span className="rv-entry-text">{excerpt(item.content, 44) || '（空白）'}</span>
                </button>
              ))
            ) : (
              <p className="muted small rv-list-empty">这个月还没有记录，从今天开始写几句吧。</p>
            )}
          </div>

          <p className="rv-side-tip">
            <Icon name="sparkles" size={13} />
            写满一个月后，点右上角「导出」就能生成月度总结文档，按年导出会自动按月分组。
          </p>
        </aside>

        <section className="card rv-editor">
          <header className="rv-editor-head">
            <div className="rv-editor-title">
              <span className="rv-eyebrow">{formatDateCN(selected)}</span>
              <h3>{selected === today ? '今天的工作总结' : '当日工作总结'}</h3>
              <p className="muted small">
                {chars} 字 ·{' '}
                {dirty
                  ? '有未保存的修改'
                  : existing
                    ? `上次保存 ${relativeTime(existing.updatedAt)}`
                    : '还没有内容'}
              </p>
            </div>
            <div className="rv-editor-actions">
              {existing ? (
                <button type="button" className="mini-btn danger" title="删除这天总结" onClick={() => void handleDelete()}>
                  <Icon name="trash" size={15} />
                </button>
              ) : null}
              <button
                type="button"
                className={`btn btn-sm ${dirty ? 'btn-primary' : 'btn-soft'}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <span className="spinner small" /> : <Icon name={dirty || !existing ? 'check' : 'checkCircle'} size={15} />}
                {saving ? '保存中' : dirty ? '保存' : existing ? '已保存' : '保存'}
              </button>
            </div>
          </header>

          <div className="rv-tpl-row">
            <span className="muted small">插入模板</span>
            {TEMPLATES.map((item) => (
              <button key={item.key} type="button" className="rv-tpl" onClick={() => insertTemplate(item.text)}>
                {item.label}
              </button>
            ))}
          </div>

          <textarea
            ref={editorRef}
            className="rv-textarea"
            value={draft}
            placeholder={'今天完成了什么？遇到了什么问题？明天准备做什么？\n\n写几句就好，重点是留下痕迹。'}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                handleSave()
              }
            }}
          />

          <div className="rv-editor-foot">
            <span className="muted small">
              <Icon name="shield" size={13} /> 自动保存在本机，草稿不会上传
            </span>
            <span className="rv-save-state">
              <span className={`rv-state-dot ${dirty ? 'dirty' : 'clean'}`} />
              {saving ? '正在保存…' : dirty ? '等待自动保存' : existing ? '已同步到本地' : '尚未记录'}
            </span>
          </div>
        </section>
      </div>

      <SummaryExport
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        summaries={summaries}
        defaultYear={anchor.year}
        defaultMonth={anchor.month}
      />
    </div>
  )
}
