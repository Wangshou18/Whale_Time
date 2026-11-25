export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'done'
export type Period = 'am' | 'pm' | 'full'
export type AttendanceType = 'work' | 'rest'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface AttachmentMeta {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
}

export interface AttachmentRecord extends AttachmentMeta {
  taskId: string
  blob: Blob
}

export interface Task {
  id: string
  title: string
  content: string
  startDate: string
  dueDate: string | null
  priority: Priority
  tags: string[]
  status: TaskStatus
  completedAt: string | null
  attachments: AttachmentMeta[]
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  date: string | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  date: string
  period: Period
  type: AttendanceType
  createdAt: string
}

/** 每日工作总结：一天一条，id 与 date 相同 */
export interface DailySummary {
  id: string
  date: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  theme: ThemeMode
  reminderDays: number
}

export interface AppDataBundle {
  tasks: Task[]
  notes: Note[]
  attendance: AttendanceRecord[]
  summaries: DailySummary[]
}

export interface BackupPayload extends AppDataBundle {
  app: string
  version: number
  exportedAt: string
  attachmentsIncluded: boolean
  settings: Settings
}

export interface ImportResult {
  tasks: number
  notes: number
  attendance: number
  summaries: number
  attachments: number
  settings?: Settings
}

export const PRIORITY_META: Record<Priority, { label: string; short: string; color: string; weight: number }> = {
  urgent: { label: '紧急', short: '急', color: 'var(--p-urgent)', weight: 0 },
  high: { label: '高', short: '高', color: 'var(--p-high)', weight: 1 },
  medium: { label: '中', short: '中', color: 'var(--p-medium)', weight: 2 },
  low: { label: '低', short: '低', color: 'var(--p-low)', weight: 3 },
}

export const PRIORITY_OPTIONS: Priority[] = ['urgent', 'high', 'medium', 'low']

export const PERIOD_LABEL: Record<Period, string> = { am: '上午', pm: '下午', full: '全天' }
export const ATTENDANCE_LABEL: Record<AttendanceType, string> = { work: '已打卡', rest: '休息' }
