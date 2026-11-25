import { useMemo, useState } from 'react'
import type { Priority, Task } from '../types'
import { PRIORITY_META, PRIORITY_OPTIONS } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { TaskItem } from '../components/TaskItem'
import { Icon } from '../components/Icons'
import { dueInfo, formatShort, todayISO } from '../utils/date'

type Tab = 'todo' | 'done' | 'all'
type SortKey = 'due' | 'priority' | 'created' | 'title'

const SORT_LABEL: Record<SortKey, string> = {
  due: '按截止日期',
  priority: '按优先级',
  created: '按创建时间',
  title: '按标题',
}

export function Tasks() {
  const { tasks, deleteTask, toggleTask, settings, notify } = useApp()
  const { route, navigate, openTaskEditor, confirm } = useUI()
  const segment = route.split('/')[2]
  const tab: Tab = segment === 'done' || segment === 'all' ? segment : 'todo'

  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState<SortKey>('due')
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const today = todayISO()
  const openCount = tasks.filter((task) => task.status === 'todo').length
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const overdueCount = tasks.filter((task) => task.status === 'todo' && task.dueDate && task.dueDate < today).length

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((task) => task.tags.forEach((item) => set.add(item)))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [tasks])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const result = tasks.filter((task) => {
      if (tab === 'todo' && task.status !== 'todo') return false
      if (tab === 'done' && task.status !== 'done') return false
      if (tab === 'all' && statusFilter !== 'all' && task.status !== statusFilter) return false
      if (priority !== 'all' && task.priority !== priority) return false
      if (tag !== 'all' && !task.tags.includes(tag)) return false
      if (keyword) {
        const haystack = `${task.title} ${task.content} ${task.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      if (from || to) {
        const start = from || '0000-01-01'
        const end = to || '9999-12-31'
        const taskEnd = task.dueDate ?? task.startDate
        if (taskEnd < start || task.startDate > end) return false
      }
      return true
    })

    return result.sort((a, b) => {
      if (sort === 'priority') {
        const diff = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight
        if (diff !== 0) return diff
        return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
      }
      if (sort === 'created') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
      return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
    })
  }, [tasks, tab, statusFilter, priority, tag, query, from, to, sort])

  const handleDelete = async (task: Task) => {
    const ok = await confirm({
      title: '删除这个任务？',
      message: `「${task.title}」及其全部附件将从本地永久删除，且无法恢复。`,
      confirmText: '删除任务',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteTask(task.id)
      notify('任务已删除', 'info')
    } catch {
      notify('删除任务失败，请重试', 'error')
    }
  }

  const resetFilters = () => {
    setQuery('')
    setPriority('all')
    setTag('all')
    setSort('due')
    setStatusFilter('all')
    setFrom('')
    setTo('')
  }

  const hasFilter = query || priority !== 'all' || tag !== 'all' || from || to || (tab === 'all' && statusFilter !== 'all')

  return (
    <div className="tasks-page">
      <div className="page-bar">
        <div className="segmented">
          <button type="button" className={tab === 'todo' ? 'active' : ''} onClick={() => navigate('/tasks/todo')}>
            待办 <span className="tab-count">{openCount}</span>
          </button>
          <button type="button" className={tab === 'done' ? 'active' : ''} onClick={() => navigate('/tasks/done')}>
            已办 <span className="tab-count">{doneCount}</span>
          </button>
          <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => navigate('/tasks/all')}>
            汇总 <span className="tab-count">{tasks.length}</span>
          </button>
        </div>
      </div>

      {tab === 'all' ? (
        <section className="stat-grid compact-stats">
          <article className="mini-stat">
            <span>全部任务</span>
            <strong>{tasks.length}</strong>
          </article>
          <article className="mini-stat">
            <span>待办</span>
            <strong>{openCount}</strong>
          </article>
          <article className="mini-stat">
            <span>已完成</span>
            <strong>{doneCount}</strong>
          </article>
          <article className={`mini-stat ${overdueCount ? 'danger' : ''}`}>
            <span>已逾期</span>
            <strong>{overdueCount}</strong>
          </article>
        </section>
      ) : null}

      <section className="filter-bar">
        <div className="search-input">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、内容或标签…"
            aria-label="搜索任务"
          />
        </div>
        {tab === 'all' ? (
          <select className="input select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">全部状态</option>
            <option value="todo">未完成</option>
            <option value="done">已完成</option>
          </select>
        ) : null}
        <select className="input select-sm" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
          <option value="all">全部优先级</option>
          {PRIORITY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {PRIORITY_META[item].label}优先级
            </option>
          ))}
        </select>
        <select className="input select-sm" value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="all">全部标签</option>
          {tagOptions.map((item) => (
            <option key={item} value={item}>
              #{item}
            </option>
          ))}
        </select>
        {tab === 'all' ? (
          <div className="date-range">
            <input type="date" className="input select-sm" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="起始日期" />
            <span>至</span>
            <input type="date" className="input select-sm" value={to} onChange={(event) => setTo(event.target.value)} aria-label="结束日期" />
          </div>
        ) : null}
        <select className="input select-sm" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABEL[key]}
            </option>
          ))}
        </select>
        {hasFilter ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
            清除筛选
          </button>
        ) : null}
      </section>

      {tab === 'all' ? (
        <section className="card table-card">
          <header className="section-head">
            <div>
              <h3>任务汇总清单</h3>
              <p>当前筛选共 {filtered.length} 条记录</p>
            </div>
          </header>
          {filtered.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>任务</th>
                    <th>状态</th>
                    <th>优先级</th>
                    <th>开始</th>
                    <th>截止</th>
                    <th>标签</th>
                    <th className="col-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const due = dueInfo(task.dueDate, settings.reminderDays, today)
                    return (
                      <tr key={task.id} onClick={() => openTaskEditor({ id: task.id })}>
                        <td>
                          <span className={`table-title ${task.status === 'done' ? 'done' : ''}`}>{task.title}</span>
                        </td>
                        <td>
                          <span className={`status-chip ${task.status}`}>{task.status === 'done' ? '已完成' : '未完成'}</span>
                        </td>
                        <td>
                          <span className="priority-chip" style={{ color: PRIORITY_META[task.priority].color }}>
                            <span className="priority-dot" style={{ background: PRIORITY_META[task.priority].color }} />
                            {PRIORITY_META[task.priority].label}
                          </span>
                        </td>
                        <td className="mono">{formatShort(task.startDate)}</td>
                        <td>
                          {task.dueDate ? (
                            <span className={task.status === 'todo' ? `due-text ${due.level}` : 'mono'}>{formatShort(task.dueDate)}</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className="table-tags">
                            {task.tags.length ? task.tags.slice(0, 2).map((item) => <span key={item} className="tag small">#{item}</span>) : <span className="muted">—</span>}
                          </span>
                        </td>
                        <td className="col-actions">
                          <button
                            type="button"
                            className="mini-btn"
                            title={task.status === 'done' ? '恢复为未完成' : '标记完成'}
                            onClick={(event) => {
                              event.stopPropagation()
                              void toggleTask(task.id)
                            }}
                          >
                            <Icon name={task.status === 'done' ? 'restore' : 'check'} size={15} />
                          </button>
                          <button
                            type="button"
                            className="mini-btn"
                            title="编辑"
                            onClick={(event) => {
                              event.stopPropagation()
                              openTaskEditor({ id: task.id })
                            }}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            type="button"
                            className="mini-btn danger"
                            title="删除"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDelete(task)
                            }}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="filter" size={24} /></div>
              <h4>没有符合条件的任务</h4>
              <p>换一组筛选条件试试，或者新建一条任务。</p>
              <button type="button" className="btn btn-soft" onClick={resetFilters}>
                清除筛选
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="card task-list-card">
          <header className="section-head">
            <div>
              <h3>{tab === 'todo' ? '待办任务' : '已完成任务'}</h3>
              <p>{hasFilter ? `筛选出 ${filtered.length} 条` : tab === 'todo' ? '按截止日期从近到远排列' : '完成时间不会丢失，可随时恢复'}</p>
            </div>
            {tab === 'todo' && !hasFilter && overdueCount ? (
              <span className="badge badge-danger">{overdueCount} 项逾期</span>
            ) : null}
          </header>

          <div className="task-list">
            {filtered.length ? (
              filtered.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={() => openTaskEditor({ id: task.id })}
                  onDelete={() => handleDelete(task)}
                />
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Icon name={hasFilter ? 'filter' : tab === 'todo' ? 'sparkles' : 'checkCircle'} size={24} />
                </div>
                <h4>{hasFilter ? '没有匹配的任务' : tab === 'todo' ? '待办清空了' : '还没有已完成的任务'}</h4>
                <p>
                  {hasFilter
                    ? '调整关键词或筛选条件再看看。'
                    : tab === 'todo'
                      ? '一切都在掌控之中，或者，给自己安排点新挑战。'
                      : '完成任务后会自动归档到这里。'}
                </p>
                {hasFilter ? (
                  <button type="button" className="btn btn-soft" onClick={resetFilters}>
                    清除筛选
                  </button>
                ) : tab === 'todo' ? (
                  <button type="button" className="btn btn-primary" onClick={() => openTaskEditor()}>
                    <Icon name="plus" size={15} /> 新建任务
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
