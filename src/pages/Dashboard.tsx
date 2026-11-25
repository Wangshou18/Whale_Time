import { useMemo } from 'react'
import { PRIORITY_META } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { TaskItem } from '../components/TaskItem'
import { Icon } from '../components/Icons'
import {
  formatDateCN,
  fromISO,
  dueInfo,
  greeting,
  todayISO,
  toISO,
} from '../utils/date'
import { buildAgenda, dayAttendance } from '../utils/attendance'
import { excerpt } from '../utils/markdown'
import { countChars } from '../utils/summary'

export function Dashboard() {
  const { tasks, notes, attendance, summaries, settings, setAttendance, notify } = useApp()
  const { navigate, openTaskEditor, openNoteEditor } = useUI()
  const today = todayISO()
  const todaySummary = summaries.find((item) => item.date === today)

  const openTasks = tasks.filter((task) => task.status === 'todo')
  const doneTasks = tasks.filter((task) => task.status === 'done')
  const overdue = openTasks.filter((task) => task.dueDate && task.dueDate < today)
  const todayList = openTasks
    .filter((task) => task.startDate === today || (task.dueDate && task.dueDate <= today))
    .sort((a, b) => {
      const aDue = a.dueDate ?? '9999-12-31'
      const bDue = b.dueDate ?? '9999-12-31'
      if (aDue !== bDue) return aDue.localeCompare(bDue)
      return PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight
    })
  const doneToday = doneTasks.filter((task) => task.completedAt && toISO(new Date(task.completedAt)) === today).length
  const monthPrefix = today.slice(0, 7)
  const notesThisMonth = notes.filter((note) => note.createdAt.slice(0, 7) === monthPrefix).length

  const notices = useMemo(() => {
    return openTasks
      .filter((task) => task.dueDate)
      .map((task) => ({ task, info: dueInfo(task.dueDate, settings.reminderDays, today) }))
      .filter((item) => item.info.level !== 'normal')
      .sort((a, b) => {
        if (a.info.days !== b.info.days) return a.info.days - b.info.days
        return PRIORITY_META[a.task.priority].weight - PRIORITY_META[b.task.priority].weight
      })
  }, [openTasks, settings.reminderDays, today])

  const agenda = useMemo(() => buildAgenda(tasks, notes, today), [tasks, notes, today])
  const todayAttendance = dayAttendance(attendance.filter((record) => record.date === today))
  const date = fromISO(today)

  const handlePunch = async (type: 'work' | 'rest') => {
    const active = todayAttendance.full?.type === type
    await setAttendance(today, 'full', active ? null : type)
    notify(active ? '已清除今日考勤' : type === 'work' ? '今日已打卡' : '已记录今日休息', 'info')
  }

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <span className="hero-eyebrow">{formatDateCN(today)}</span>
          <h2>
            {greeting()}，主人<span className="hero-dot">.</span>
          </h2>
          <p>
            {todayList.length
              ? `今天有 ${todayList.length} 项待办${overdue.length ? `，其中 ${overdue.length} 项已逾期` : ''}。先挑最要紧的一件开始吧。`
              : '今天没有到期的任务，适合整理思绪、做点长期有益的事。'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-on-hero" onClick={() => openTaskEditor()}>
              <Icon name="plus" size={16} /> 新建任务
            </button>
            <button type="button" className="btn btn-on-hero ghost" onClick={() => openNoteEditor()}>
              <Icon name="notePlus" size={16} /> 写笔记
            </button>
          </div>
        </div>
        <div className="hero-date" aria-hidden="true">
          <span>{date.getMonth() + 1} 月</span>
          <strong>{String(date.getDate()).padStart(2, '0')}</strong>
          <span>{formatDateCN(today).split(' ').pop()}</span>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-icon blue"><Icon name="tasks" size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">待办任务</span>
            <strong className="stat-value">{openTasks.length}</strong>
            <span className="stat-foot">今日安排 {todayList.length} 项</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon green"><Icon name="checkCircle" size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">已完成</span>
            <strong className="stat-value">{doneTasks.length}</strong>
            <span className="stat-foot">今天完成 {doneToday} 项</span>
          </div>
        </article>
        <article className={`stat-card ${overdue.length ? 'warn' : ''}`}>
          <div className="stat-icon red"><Icon name="alert" size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">已逾期</span>
            <strong className="stat-value">{overdue.length}</strong>
            <span className="stat-foot">{overdue.length ? '需要尽快处理' : '状态良好'}</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber"><Icon name="notes" size={20} /></div>
          <div className="stat-body">
            <span className="stat-label">笔记</span>
            <strong className="stat-value">{notes.length}</strong>
            <span className="stat-foot">本月新增 {notesThisMonth} 篇</span>
          </div>
        </article>
      </section>

      <section className="notice-band">
        <div className="notice-head">
          <span className="notice-title">
            <Icon name="bell" size={17} /> 提醒
          </span>
          <span className={`badge ${notices.length ? 'badge-warn' : ''}`}>{notices.length}</span>
        </div>
        <div className="notice-list">
          {notices.length ? (
            notices.slice(0, 4).map(({ task, info }) => (
              <button
                type="button"
                key={task.id}
                className={`notice-item ${info.level}`}
                onClick={() => openTaskEditor({ id: task.id })}
              >
                <span className={`notice-dot ${info.level}`} />
                <span className="notice-text">{task.title}</span>
                <span className={`due-chip ${info.level}`}>{info.label}</span>
              </button>
            ))
          ) : (
            <span className="notice-empty">
              <Icon name="checkCircle" size={15} /> 暂无到期提醒，保持这个节奏。
            </span>
          )}
          {notices.length > 4 ? (
            <button type="button" className="notice-more" onClick={() => navigate('/tasks/todo')}>
              另有 {notices.length - 4} 条
              <Icon name="chevronRight" size={14} />
            </button>
          ) : null}
        </div>
      </section>

      <div className="dash-grid">
        <div className="dash-main">
          <section className="card">
            <header className="section-head">
              <div>
                <h3>今日待办</h3>
                <p>今天到期、已逾期或今天开始的任务</p>
              </div>
              <button type="button" className="link-btn" onClick={() => navigate('/tasks/todo')}>
                全部任务 <Icon name="arrowRight" size={15} />
              </button>
            </header>
            <div className="task-list">
              {todayList.length ? (
                todayList.slice(0, 6).map((task) => (
                  <TaskItem key={task.id} task={task} compact onEdit={() => openTaskEditor({ id: task.id })} />
                ))
              ) : (
                <div className="empty-state compact">
                  <div className="empty-icon"><Icon name="inbox" size={22} /></div>
                  <p>今天还没有待办，享受这份清静。</p>
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => openTaskEditor()}>
                    <Icon name="plus" size={14} /> 安排一件事
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="dash-side">
          <section className="card attendance-card">
            <header className="section-head">
              <div>
                <h3>今日考勤</h3>
                <p>{formatDateCN(today, false)}</p>
              </div>
              <button type="button" className="link-btn" onClick={() => navigate('/attendance')}>
                详情 <Icon name="arrowRight" size={14} />
              </button>
            </header>
            <div className="att-mini">
              <span className={`att-orb ${todayAttendance.work ? 'work' : todayAttendance.rest ? 'rest' : ''}`}>
                <Icon name={todayAttendance.work ? 'work' : todayAttendance.rest ? 'rest' : 'clock'} size={20} />
              </span>
              <div className="att-mini-text">
                <strong>{todayAttendance.summary}</strong>
                <span>{todayAttendance.work ? '辛苦了，记得喝水。' : todayAttendance.rest ? '好好休息，蓄点力气。' : '还没记录今天的出勤。'}</span>
              </div>
            </div>
            <div className="quick-pills">
              <button
                type="button"
                className={`quick-pill ${todayAttendance.full?.type === 'work' ? 'active work' : ''}`}
                onClick={() => handlePunch('work')}
              >
                <Icon name="check" size={15} /> 打卡
              </button>
              <button
                type="button"
                className={`quick-pill ${todayAttendance.full?.type === 'rest' ? 'active rest' : ''}`}
                onClick={() => handlePunch('rest')}
              >
                <Icon name="rest" size={15} /> 休息
              </button>
            </div>
          </section>

          <section className="card">
            <header className="section-head">
              <div>
                <h3>今日总结</h3>
                <p>{todaySummary ? `已写 ${countChars(todaySummary.content)} 字` : '给今天收个尾，写几句就够'}</p>
              </div>
              <button type="button" className="link-btn" onClick={() => navigate('/review')}>
                {todaySummary ? '完善' : '去写'} <Icon name="arrowRight" size={14} />
              </button>
            </header>
            {todaySummary ? (
              <p className="dash-summary-text">{excerpt(todaySummary.content, 140)}</p>
            ) : (
              <div className="empty-state compact">
                <div className="empty-icon"><Icon name="review" size={22} /></div>
                <p>还没写今天的总结，几分钟就能留下点东西。</p>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/review')}>
                  <Icon name="edit" size={14} /> 写几句
                </button>
              </div>
            )}
          </section>

          <section className="card">
            <header className="section-head">
              <div>
                <h3>今日日程</h3>
                <p>任务节点与关联笔记</p>
              </div>
              <button type="button" className="link-btn" onClick={() => navigate('/calendar')}>
                日历 <Icon name="arrowRight" size={14} />
              </button>
            </header>
            <div className="agenda-list">
              {agenda.length ? (
                agenda.slice(0, 5).map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`agenda-item ${item.done ? 'done' : ''}`}
                    onClick={() =>
                      item.task ? openTaskEditor({ id: item.task.id }) : item.note ? openNoteEditor({ id: item.note.id }) : null
                    }
                  >
                    <span className={`agenda-dot ${item.kind}`} />
                    <span className="agenda-main">
                      <strong>{item.title}</strong>
                      <span>{item.label}</span>
                    </span>
                    <Icon name={item.kind === 'task' ? 'tasks' : 'notes'} size={15} />
                  </button>
                ))
              ) : (
                <p className="muted small">今天没有安排，空白的日程也是一种自由。</p>
              )}
            </div>
          </section>

          <section className="card">
            <header className="section-head">
              <div>
                <h3>快捷入口</h3>
              </div>
            </header>
            <div className="quick-grid">
              <button type="button" className="quick-entry" onClick={() => openTaskEditor()}>
                <span className="quick-icon blue"><Icon name="plus" size={18} /></span>
                <span>新建任务</span>
              </button>
              <button type="button" className="quick-entry" onClick={() => openNoteEditor()}>
                <span className="quick-icon amber"><Icon name="notePlus" size={18} /></span>
                <span>写笔记</span>
              </button>
              <button type="button" className="quick-entry" onClick={() => navigate('/attendance')}>
                <span className="quick-icon green"><Icon name="attendance" size={18} /></span>
                <span>去打卡</span>
              </button>
              <button type="button" className="quick-entry" onClick={() => navigate('/calendar')}>
                <span className="quick-icon purple"><Icon name="calendar" size={18} /></span>
                <span>看日历</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
