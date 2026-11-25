import type { ReactNode } from 'react'
import type { ThemeMode } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { formatDateCN, todayISO, weekdayName } from '../utils/date'
import { BrandMark, Icon, type IconName } from './Icons'

interface NavItem {
  key: string
  label: string
  icon: IconName
  path: string
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: '仪表盘', icon: 'dashboard', path: '/dashboard' },
  { key: 'tasks', label: '任务', icon: 'tasks', path: '/tasks/todo' },
  { key: 'calendar', label: '日历', icon: 'calendar', path: '/calendar' },
  { key: 'attendance', label: '考勤', icon: 'attendance', path: '/attendance' },
  { key: 'notes', label: '笔记', icon: 'notes', path: '/notes' },
  { key: 'review', label: '总结', icon: 'review', path: '/review' },
  { key: 'settings', label: '设置', icon: 'settings', path: '/settings' },
]

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: '仪表盘', subtitle: '今天也要稳稳推进。' },
  tasks: { title: '任务', subtitle: '收拢每一件要做的事，按自己的节奏完成。' },
  calendar: { title: '日历', subtitle: '任务、笔记与考勤，在同一条时间线上相遇。' },
  attendance: { title: '考勤', subtitle: '记录出勤与休息，给努力留下痕迹。' },
  notes: { title: '笔记', subtitle: '把灵感和信息留在本地，随时翻回来。' },
  review: { title: '工作总结', subtitle: '每天几行字，按月按年攒成自己的成绩单。' },
  settings: { title: '设置', subtitle: '主题、提醒与数据备份，都在这里。' },
}

const THEME_ICON: Record<ThemeMode, IconName> = { light: 'sun', dark: 'moon', system: 'monitor' }
const THEME_LABEL: Record<ThemeMode, string> = { light: '浅色', dark: '深色', system: '跟随系统' }

export function Layout({ page, children }: { page: string; children: ReactNode }) {
  const { settings, updateSettings } = useApp()
  const { route, navigate, openTaskEditor, openShortcuts } = useUI()
  const meta = PAGE_META[page] ?? PAGE_META.dashboard

  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(settings.theme) + 1) % order.length]
    updateSettings({ theme: next })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark size={38} />
          <div className="brand-text">
            <strong>鲸时</strong>
            <span>个人工作助手</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          {NAV.map((item) => {
            const active = page === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="side-bottom">
          <button type="button" className="local-badge" onClick={() => navigate('/settings')}>
            <span className="pulse-dot" />
            <div>
              <strong>纯本地存储</strong>
              <span>数据不会离开这台设备</span>
            </div>
            <Icon name="shield" size={15} />
          </button>
          <div className="side-tools">
            <button type="button" className="side-tool" onClick={cycleTheme} title={`主题：${THEME_LABEL[settings.theme]}`}>
              <Icon name={THEME_ICON[settings.theme]} size={16} />
              {THEME_LABEL[settings.theme]}
            </button>
            <button type="button" className="side-tool" onClick={openShortcuts} title="快捷键">
              <Icon name="keyboard" size={16} />
              快捷键
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <div className="mobile-brand">
              <BrandMark size={30} />
            </div>
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="date-chip">
              <Icon name="calendar" size={15} />
              {formatDateCN(todayISO(), false)} · {weekdayName(todayISO())}
            </span>
            <button type="button" className="btn btn-primary" onClick={() => openTaskEditor()}>
              <Icon name="plus" size={16} />
              <span className="hide-sm">新建任务</span>
            </button>
          </div>
        </header>

        <main className="page" key={route}>
          {children}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {NAV.map((item) => {
          const active = page === item.key
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
