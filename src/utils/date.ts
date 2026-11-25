const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

/** 返回 to - from 的天数（自然日） */
export function diffDays(from: string, to: string): number {
  const a = fromISO(from)
  const b = fromISO(to)
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  )
}

export function startOfWeekISO(iso: string): string {
  const date = fromISO(iso)
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + offset)
  return toISO(date)
}

export function endOfMonthISO(year: number, month: number): string {
  return toISO(new Date(year, month + 1, 0))
}

/** 月视图 42 格（周一起始） */
export function monthGrid(year: number, month: number): string[] {
  const first = toISO(new Date(year, month, 1))
  const start = startOfWeekISO(first)
  return Array.from({ length: 42 }, (_, i) => addDaysISO(start, i))
}

export function weekDays(startISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(startISO, i))
}

export function formatMonthDay(iso: string): string {
  const d = fromISO(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatFullDate(iso: string): string {
  const d = fromISO(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatDateCN(iso: string, withWeek = true): string {
  const d = fromISO(iso)
  const base = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  return withWeek ? `${base} ${WEEKDAY_CN[d.getDay()]}` : base
}

export function formatShort(iso: string): string {
  const d = fromISO(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function weekdayName(iso: string): string {
  return WEEKDAY_CN[fromISO(iso).getDay()]
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[fromISO(iso).getDay()]
}

export function monthLabel(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function relativeTime(isoDateTime: string): string {
  const then = new Date(isoDateTime).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(isoDateTime).toLocaleDateString('zh-CN')
}

export interface DueInfo {
  label: string
  level: 'overdue' | 'today' | 'soon' | 'normal'
  days: number
}

export function dueInfo(due: string | null, reminderDays = 3, today = todayISO()): DueInfo {
  if (!due) return { label: '无截止日期', level: 'normal', days: 0 }
  const days = diffDays(today, due)
  if (days < 0) return { label: `已逾期 ${Math.abs(days)} 天`, level: 'overdue', days }
  if (days === 0) return { label: '今天到期', level: 'today', days }
  if (days <= reminderDays) return { label: `${days} 天后到期`, level: 'soon', days }
  return { label: `${formatShort(due)} 到期`, level: 'normal', days }
}
