import { useMemo, useState } from 'react'
import type { AttendanceRecord, Note, Task } from '../types'
import { PRIORITY_META } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { Icon } from '../components/Icons'
import { TaskItem } from '../components/TaskItem'
import {
  addDaysISO,
  formatDateCN,
  formatFullDate,
  formatShort,
  fromISO,
  monthGrid,
  monthLabel,
  startOfWeekISO,
  toISO,
  todayISO,
  weekDays,
  weekdayName,
  weekdayShort,
} from '../utils/date'
import { dayAttendance } from '../utils/attendance'
import { excerpt } from '../utils/markdown'

type View = 'month' | 'week' | 'day'

interface DayTask {
  task: Task
  kind: 'start' | 'due' | 'both'
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function groupByDate<T>(items: T[], getDate: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  items.forEach((item) => {
    const date = getDate(item)
    if (!date) return
    const list = map.get(date)
    if (list) list.push(item)
    else map.set(date, [item])
  })
  return map
}

export function CalendarPage() {
  const { tasks, notes, attendance, setAttendance, settings, notify } = useApp()
  const { openTaskEditor, openNoteEditor } = useUI()
  const today = todayISO()
  const [view, setView] = useState<View>('month')
  const [selected, setSelected] = useState(today)
  const [anchor, setAnchor] = useState(today)

  const date = fromISO(anchor)
  const year = date.getFullYear()
  const month = date.getMonth()
  const days = view === 'month' ? monthGrid(year, month) : weekDays(startOfWeekISO(anchor))
  const weekStart = startOfWeekISO(anchor)

  const attendanceByDate = useMemo(() => groupByDate<AttendanceRecord>(attendance, (record) => record.date), [attendance])
  const notesByDate = useMemo(() => groupByDate<Note>(notes, (note) => note.date), [notes])

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthTasks = tasks.filter((task) => task.startDate.startsWith(monthPrefix) || task.dueDate?.startsWith(monthPrefix))
  const monthDone = monthTasks.filter((task) => task.status === 'done').length
  const monthOverdue = monthTasks.filter((task) => task.status === 'todo' && task.dueDate && task.dueDate < today).length
  const monthNotes = notes.filter((note) => note.date?.startsWith(monthPrefix)).length
  const monthWorkDays = new Set(
    attendance.filter((record) => record.date.startsWith(monthPrefix) && record.type === 'work').map((record) => record.date),
  ).size
  const monthRestDays = new Set(
    attendance.filter((record) => record.date.startsWith(monthPrefix) && record.type === 'rest').map((record) => record.date),
  ).size

  const tasksForDay = (day: string): DayTask[] => {
    const list: DayTask[] = []
    tasks.forEach((task) => {
      const isStart = task.startDate === day
      const isDue = task.dueDate === day
      if (!isStart && !isDue) return
      list.push({ task, kind: isStart && isDue ? 'both' : isDue ? 'due' : 'start' })
    })
    return list.sort((a, b) => {
      if (a.task.status !== b.task.status) return a.task.status === 'done' ? 1 : -1
      return PRIORITY_META[a.task.priority].weight - PRIORITY_META[b.task.priority].weight
    })
  }

  const selectedTasks = tasksForDay(selected)
  const selectedNotes = notesByDate.get(selected) ?? []
  const selectedAtt = dayAttendance(attendanceByDate.get(selected) ?? [])

  const headerLabel =
    view === 'month'
      ? monthLabel(year, month)
      : view === 'week'
        ? `${formatShort(weekStart)} – ${formatShort(addDaysISO(weekStart, 6))}`
        : `${weekdayName(anchor)}的日程`
  const headerSub =
    view === 'week'
      ? `${fromISO(weekStart).getFullYear()} 年`
      : view === 'month'
        ? `共 ${days.filter((day) => fromISO(day).getMonth() === month).length} 天`
        : `${formatFullDate(anchor)}${anchor === today ? ' · 今天' : ''}`

  const changeView = (next: View) => {
    setView(next)
    setAnchor(selected)
  }

  const shift = (direction: number) => {
    if (view === 'month') {
      const next = new Date(year, month + direction, 1)
      const iso = toISO(next)
      setAnchor(iso)
      setSelected(iso)
      return
    }
    const step = view === 'week' ? 7 : 1
    const nextDate = addDaysISO(anchor, direction * step)
    setAnchor(nextDate)
    setSelected(nextDate)
  }

  const goToday = () => {
    setAnchor(today)
    setSelected(today)
  }

  const selectDay = (day: string) => {
    setSelected(day)
    if (view === 'month' && fromISO(day).getMonth() !== month) setAnchor(day)
  }

  const markAttendance = async (type: 'work' | 'rest') => {
    const active = selectedAtt.full?.type === type
    await setAttendance(selected, 'full', active ? null : type)
    notify(active ? '已清除考勤记录' : type === 'work' ? `${formatShort(selected)} 已打卡` : `${formatShort(selected)} 已记录休息`, 'info')
  }

  const renderCellItems = (day: string, limit: number) => {
    const dayTasks = tasksForDay(day)
    const att = dayAttendance(attendanceByDate.get(day) ?? [])
    const dayNotes = notesByDate.get(day) ?? []
    return (
      <>
        <div className="cal-cell-items">
          {dayTasks.slice(0, limit).map(({ task, kind }) => (
            <span
              key={task.id}
              className={`task-chip ${task.priority} ${task.status === 'done' ? 'done' : ''}`}
              title={`${task.title} · ${kind === 'both' ? '开始并截止' : kind === 'due' ? '截止' : '开始'}`}
            >
              <span className="chip-dot" />
              <span className="chip-text">{task.title}</span>
            </span>
          ))}
          {dayTasks.length > limit ? <span className="cal-more">+{dayTasks.length - limit} 项</span> : null}
        </div>
        <div className="cal-cell-foot">
          {att.work ? <span className="att-dot work" title={att.summary} /> : null}
          {att.rest ? <span className="att-dot rest" title={att.summary} /> : null}
          {dayNotes.length ? (
            <span className="note-dot" title={`${dayNotes.length} 篇笔记`}>
              <Icon name="notes" size={11} />
              {dayNotes.length}
            </span>
          ) : null}
        </div>
      </>
    )
  }

  return (
    <div className="calendar-page">
      <div className="page-bar cal-bar">
        <div className="cal-title">
          <div className="cal-nav-btns">
            <button type="button" className="icon-btn bordered" onClick={() => shift(-1)} aria-label="上一个周期">
              <Icon name="chevronLeft" size={17} />
            </button>
            <button type="button" className="icon-btn bordered" onClick={() => shift(1)} aria-label="下一个周期">
              <Icon name="chevronRight" size={17} />
            </button>
          </div>
          <div>
            <h2 className="cal-label">{headerLabel}</h2>
            <p className="cal-sub">{headerSub}</p>
          </div>
        </div>
        <div className="cal-tools">
          <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>
            今天
          </button>
          <div className="segmented">
            <button type="button" className={view === 'day' ? 'active' : ''} onClick={() => changeView('day')}>
              日
            </button>
            <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => changeView('week')}>
              周
            </button>
            <button type="button" className={view === 'month' ? 'active' : ''} onClick={() => changeView('month')}>
              月
            </button>
          </div>
        </div>
      </div>

      {view === 'day' ? (
        <div className="day-view">
          <section className="card day-agenda">
            <header className="day-agenda-head">
              <div className="day-big">
                <strong>{String(fromISO(anchor).getDate()).padStart(2, '0')}</strong>
                <div>
                  <span>{fromISO(anchor).getFullYear()} 年 {fromISO(anchor).getMonth() + 1} 月</span>
                  <h3>{weekdayName(anchor)}{anchor === today ? ' · 今天' : ''}</h3>
                </div>
              </div>
              <div className="day-att">
                <span className={`att-pill ${selectedAtt.work ? 'work' : selectedAtt.rest ? 'rest' : ''}`}>{selectedAtt.summary}</span>
                <div className="quick-pills">
                  <button
                    type="button"
                    className={`quick-pill ${selectedAtt.full?.type === 'work' ? 'active work' : ''}`}
                    onClick={() => markAttendance('work')}
                  >
                    <Icon name="check" size={14} /> 全天打卡
                  </button>
                  <button
                    type="button"
                    className={`quick-pill ${selectedAtt.full?.type === 'rest' ? 'active rest' : ''}`}
                    onClick={() => markAttendance('rest')}
                  >
                    <Icon name="rest" size={14} /> 全天休息
                  </button>
                </div>
              </div>
            </header>

            <div className="day-section">
              <div className="section-head">
                <div>
                  <h3>任务节点</h3>
                  <p>{selectedTasks.length ? `${selectedTasks.length} 项任务在今天开始或截止` : '今天没有任务节点'}</p>
                </div>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => openTaskEditor({ startDate: anchor })}>
                  <Icon name="plus" size={14} /> 新建任务
                </button>
              </div>
              <div className="task-list">
                {selectedTasks.length ? (
                  selectedTasks.map(({ task }) => (
                    <TaskItem key={task.id} task={task} onEdit={() => openTaskEditor({ id: task.id })} />
                  ))
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon"><Icon name="calendarPlus" size={22} /></div>
                    <p>这一天还很空，安排点什么？</p>
                  </div>
                )}
              </div>
            </div>

            <div className="day-section">
              <div className="section-head">
                <div>
                  <h3>关联笔记</h3>
                  <p>{selectedNotes.length ? `${selectedNotes.length} 篇笔记关联这一天` : '暂无关联笔记'}</p>
                </div>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => openNoteEditor({ date: anchor })}>
                  <Icon name="notePlus" size={14} /> 写笔记
                </button>
              </div>
              <div className="note-mini-list">
                {selectedNotes.length ? (
                  selectedNotes.map((note) => (
                    <button type="button" key={note.id} className="note-mini" onClick={() => openNoteEditor({ id: note.id })}>
                      <Icon name="notes" size={16} />
                      <span className="note-mini-body">
                        <strong>{note.title}</strong>
                        <span>{excerpt(note.content, 70) || '空白笔记'}</span>
                      </span>
                      <Icon name="chevronRight" size={15} />
                    </button>
                  ))
                ) : (
                  <p className="muted small">给这一天写点记录，以后回看会很有意思。</p>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="cal-layout">
          <section className={`card cal-card view-${view}`}>
            {view === 'week' ? (
              <div className="week-head">
                {days.map((day) => (
                  <div key={day} className={`week-head-cell ${day === today ? 'today' : ''}`}>
                    <span>周{weekdayShort(day)}</span>
                    <strong>{fromISO(day).getDate()}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="month-head">
                {WEEK_LABELS.map((label) => (
                  <span key={label}>周{label}</span>
                ))}
              </div>
            )}

            {view === 'month' ? (
              <div className="month-grid">
                {days.map((day) => {
                  const currentMonth = fromISO(day).getMonth() === month
                  return (
                    <button
                      type="button"
                      key={day}
                      className={`cal-cell ${currentMonth ? '' : 'out'} ${day === today ? 'today' : ''} ${day === selected ? 'selected' : ''}`}
                      onClick={() => selectDay(day)}
                    >
                      <span className="cal-daynum">{fromISO(day).getDate()}</span>
                      {renderCellItems(day, 2)}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="week-grid">
                {days.map((day) => (
                  <button
                    type="button"
                    key={day}
                    className={`cal-cell week-cell ${day === today ? 'today' : ''} ${day === selected ? 'selected' : ''}`}
                    onClick={() => selectDay(day)}
                  >
                    {renderCellItems(day, 5)}
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="cal-side card">
            <header className="cal-side-head">
              <div className="side-daynum">
                <strong>{fromISO(selected).getDate()}</strong>
                <span>{fromISO(selected).getMonth() + 1} 月</span>
              </div>
              <div className="side-date-text">
                <h3>{formatDateCN(selected)}</h3>
                <p>{selectedTasks.length} 项任务 · {selectedNotes.length} 篇笔记</p>
              </div>
            </header>

            <div className="cal-att-box">
              <div className="cal-att-row">
                <span className={`att-pill ${selectedAtt.work ? 'work' : selectedAtt.rest ? 'rest' : ''}`}>{selectedAtt.summary}</span>
                <button type="button" className="link-btn" onClick={() => { setAnchor(selected); setView('day') }}>
                  展开一天 <Icon name="arrowRight" size={13} />
                </button>
              </div>
              <div className="quick-pills">
                <button
                  type="button"
                  className={`quick-pill ${selectedAtt.full?.type === 'work' ? 'active work' : ''}`}
                  onClick={() => markAttendance('work')}
                >
                  <Icon name="check" size={14} /> 打卡
                </button>
                <button
                  type="button"
                  className={`quick-pill ${selectedAtt.full?.type === 'rest' ? 'active rest' : ''}`}
                  onClick={() => markAttendance('rest')}
                >
                  <Icon name="rest" size={14} /> 休息
                </button>
                {selectedAtt.hasRecord ? (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setAttendance(selected, 'full', null)}>
                    清除
                  </button>
                ) : null}
              </div>
            </div>

            <div className="cal-side-section">
              <span className="side-label">任务</span>
              {selectedTasks.length ? (
                <div className="side-task-list">
                  {selectedTasks.map(({ task, kind }) => (
                    <button type="button" key={task.id} className="side-task" onClick={() => openTaskEditor({ id: task.id })}>
                      <span className={`side-task-dot ${task.priority}`} />
                      <span className="side-task-body">
                        <strong className={task.status === 'done' ? 'done' : ''}>{task.title}</strong>
                        <span>{kind === 'both' ? '开始并截止' : kind === 'due' ? '今日截止' : '今日开始'}</span>
                      </span>
                      {task.attachments.length ? <Icon name="paperclip" size={13} /> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted small">无任务节点</p>
              )}
            </div>

            <div className="cal-side-section">
              <span className="side-label">笔记</span>
              {selectedNotes.length ? (
                <div className="side-note-list">
                  {selectedNotes.map((note) => (
                    <button type="button" key={note.id} className="side-note" onClick={() => openNoteEditor({ id: note.id })}>
                      <Icon name="notes" size={15} />
                      <span>{note.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted small">无关联笔记</p>
              )}
            </div>

            <div className="cal-side-section">
              <span className="side-label">本月概览</span>
              <div className="cal-overview">
                <div><strong>{monthTasks.length}</strong><span>任务</span></div>
                <div><strong>{monthDone}</strong><span>完成</span></div>
                <div><strong>{monthWorkDays}</strong><span>打卡</span></div>
                <div><strong>{monthRestDays}</strong><span>休息</span></div>
                <div><strong>{monthNotes}</strong><span>笔记</span></div>
                <div><strong>{monthOverdue}</strong><span>逾期</span></div>
              </div>
            </div>

            <div className="cal-side-actions">
              <button type="button" className="btn btn-soft btn-sm" onClick={() => openTaskEditor({ startDate: selected })}>
                <Icon name="plus" size={14} /> 任务
              </button>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => openNoteEditor({ date: selected })}>
                <Icon name="notePlus" size={14} /> 笔记
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="cal-legend">
        <span><i className="legend-dot start" />任务开始</span>
        <span><i className="legend-dot due" />任务截止</span>
        <span><i className="legend-dot att" />已打卡</span>
        <span><i className="legend-dot rest" />休息</span>
        <span><i className="legend-dot note" />关联笔记</span>
        {settings.reminderDays ? <span className="muted">提前 {settings.reminderDays} 天进入提醒</span> : null}
      </div>
    </div>
  )
}
