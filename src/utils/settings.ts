import type { Settings, ThemeMode } from '../types'

const SETTINGS_KEY = 'whale-work-assistant.settings.v1'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reminderDays: 3,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    const theme: ThemeMode = parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system'
    const reminderDays = typeof parsed.reminderDays === 'number' && parsed.reminderDays >= 0 ? Math.min(30, parsed.reminderDays) : 3
    return { theme, reminderDays }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage 不可用时静默降级为本次会话设置
  }
}
