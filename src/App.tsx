import { useEffect } from 'react'
import { AppProvider, useApp } from './store/AppStore'
import { UIProvider } from './context/UIProvider'
import { useUI } from './context/uiContext'
import { Layout } from './components/Layout'
import { BrandMark } from './components/Icons'
import { ToastHost } from './components/ToastHost'
import { Dashboard } from './pages/Dashboard'
import { Tasks } from './pages/Tasks'
import { CalendarPage } from './pages/Calendar'
import { AttendancePage } from './pages/Attendance'
import { NotesPage } from './pages/Notes'
import { SummaryPage } from './pages/Summary'
import { DataTransferPage } from './pages/DataTransfer'
import { SettingsPage } from './pages/Settings'

const PAGES = ['dashboard', 'tasks', 'calendar', 'attendance', 'notes', 'review', 'transfer', 'settings']

function Shell() {
  const { route } = useUI()
  const page = route.split('/')[1] || 'dashboard'
  const safePage = PAGES.includes(page) ? page : 'dashboard'

  return (
    <Layout page={safePage}>
      {safePage === 'dashboard' ? <Dashboard /> : null}
      {safePage === 'tasks' ? <Tasks /> : null}
      {safePage === 'calendar' ? <CalendarPage /> : null}
      {safePage === 'attendance' ? <AttendancePage /> : null}
      {safePage === 'notes' ? <NotesPage /> : null}
      {safePage === 'review' ? <SummaryPage /> : null}
      {safePage === 'transfer' ? <DataTransferPage /> : null}
      {safePage === 'settings' ? <SettingsPage /> : null}
    </Layout>
  )
}

function Root() {
  const { ready, fatal, settings } = useApp()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', resolved === 'dark' ? '#0e1117' : '#f6f7fa')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  if (!ready) {
    return (
      <div className="boot-screen">
        <BrandMark size={56} />
        <div className="boot-text">
          <strong>鲸时</strong>
          <span>正在打开本地资料库…</span>
        </div>
        <span className="spinner" />
      </div>
    )
  }

  if (fatal) {
    return (
      <div className="boot-screen">
        <BrandMark size={56} />
        <div className="boot-text">
          <strong>本地数据库无法打开</strong>
          <span>{fatal}</span>
        </div>
        <p className="boot-hint">请确认浏览器未禁用 IndexedDB，或不要在无痕窗口中长期使用。数据只保存在本机，重试不会清除已有内容。</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    )
  }

  return (
    <UIProvider>
      <Shell />
      <ToastHost />
    </UIProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  )
}
