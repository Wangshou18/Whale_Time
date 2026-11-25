import JSZip from 'jszip'
import type {
  AttachmentMeta,
  AttachmentRecord,
  AttendanceRecord,
  BackupPayload,
  DailySummary,
  ImportResult,
  Note,
  Settings,
  Task,
} from '../../types'
import { getAllAttachments, loadAll } from '../../db/repository'
import { bulkReplace } from '../../db/db'
import { nowISO } from '../../utils/id'
import { isDatasetKey } from './datasets'
import type { ImportStrategy } from './types'

/* --------------------------- 归一化 --------------------------- */

function normalizeTask(raw: Partial<Task>): Task {
  const now = nowISO()
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : '未命名任务'
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `imported-${Math.random().toString(36).slice(2)}`,
    title,
    content: typeof raw.content === 'string' ? raw.content : '',
    startDate: typeof raw.startDate === 'string' && raw.startDate ? raw.startDate.slice(0, 10) : now.slice(0, 10),
    dueDate: typeof raw.dueDate === 'string' && raw.dueDate ? raw.dueDate.slice(0, 10) : null,
    priority: raw.priority === 'urgent' || raw.priority === 'high' || raw.priority === 'low' ? raw.priority : 'medium',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
    status: raw.status === 'done' ? 'done' : 'todo',
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments.filter(
          (item): item is AttachmentMeta => !!item && typeof item.id === 'string' && typeof item.name === 'string',
        )
      : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

function normalizeNote(raw: Partial<Note>): Note {
  const now = nowISO()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `imported-${Math.random().toString(36).slice(2)}`,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : '未命名笔记',
    content: typeof raw.content === 'string' ? raw.content : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
    date: typeof raw.date === 'string' && raw.date ? raw.date.slice(0, 10) : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

function normalizeAttendance(raw: Partial<AttendanceRecord>): AttendanceRecord | null {
  if (!raw || typeof raw.date !== 'string') return null
  const date = raw.date.slice(0, 10)
  const period = raw.period === 'am' || raw.period === 'pm' || raw.period === 'full' ? raw.period : null
  if (!period) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${date}-${period}`,
    date,
    period,
    type: raw.type === 'rest' ? 'rest' : 'work',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowISO(),
  }
}

function normalizeSummary(raw: Partial<DailySummary>): DailySummary | null {
  if (!raw || typeof raw.date !== 'string') return null
  const date = raw.date.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const content = typeof raw.content === 'string' ? raw.content : ''
  if (!content.trim()) return null
  return {
    id: date,
    date,
    content,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowISO(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowISO(),
  }
}

function validSettings(raw: unknown): Settings | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Partial<Settings>
  return {
    theme: value.theme === 'light' || value.theme === 'dark' ? value.theme : 'system',
    reminderDays:
      typeof value.reminderDays === 'number' ? Math.max(0, Math.min(30, Math.round(value.reminderDays))) : 3,
  }
}

/* --------------------------- 主流程 --------------------------- */

export async function importBackupFile(file: File, strategy: ImportStrategy): Promise<ImportResult> {
  const blobs = new Map<string, Blob>()
  let payload: Partial<BackupPayload>

  const isZip = /\.zip$/i.test(file.name) || file.type.includes('zip')
  if (isZip) {
    const zip = await JSZip.loadAsync(file)
    const dataEntry = zip.file('data.json') ?? zip.file(/data\.json$/)[0]
    if (!dataEntry) throw new Error('备份包中未找到 data.json')
    payload = JSON.parse(await dataEntry.async('string')) as Partial<BackupPayload>
    const paths = Object.keys(zip.files).filter((path) => path.startsWith('attachments/') && !zip.files[path].dir)
    for (const path of paths) {
      const id = path.replace(/^attachments\//, '')
      blobs.set(id, await zip.files[path].async('blob'))
    }
  } else {
    try {
      payload = JSON.parse(await file.text()) as Partial<BackupPayload>
    } catch {
      throw new Error('文件不是有效的 JSON，请选择由本应用导出的备份')
    }
  }

  if (
    !payload ||
    (!Array.isArray(payload.tasks) &&
      !Array.isArray(payload.notes) &&
      !Array.isArray(payload.attendance) &&
      !Array.isArray(payload.summaries))
  ) {
    throw new Error('无法识别的备份文件，请选择由本应用导出的 JSON 或 ZIP')
  }

  /** 单数据集备份（精细导出包）只替换对应表 */
  const rawScope = (payload as { scope?: unknown }).scope
  const scope = isDatasetKey(rawScope) ? rawScope : undefined

  const tasks = Array.isArray(payload.tasks) ? payload.tasks.map((item) => normalizeTask(item as Partial<Task>)) : []
  const notes = Array.isArray(payload.notes) ? payload.notes.map((item) => normalizeNote(item as Partial<Note>)) : []
  const attendance = Array.isArray(payload.attendance)
    ? payload.attendance
        .map((item) => normalizeAttendance(item as Partial<AttendanceRecord>))
        .filter((item): item is AttendanceRecord => !!item)
    : []
  const summaries = Array.isArray(payload.summaries)
    ? payload.summaries
        .map((item) => normalizeSummary(item as Partial<DailySummary>))
        .filter((item): item is DailySummary => !!item)
    : []

  const attachmentRecords: AttachmentRecord[] = []
  tasks.forEach((task) => {
    task.attachments = task.attachments.filter((meta) => {
      const blob = blobs.get(meta.id)
      if (!blob) return false
      attachmentRecords.push({
        ...meta,
        taskId: task.id,
        size: blob.size || meta.size || 0,
        type: meta.type || blob.type || 'application/octet-stream',
        blob,
      })
      return true
    })
  })

  const result: ImportResult = {
    tasks: tasks.length,
    notes: notes.length,
    attendance: attendance.length,
    summaries: summaries.length,
    attachments: attachmentRecords.length,
    settings: validSettings(payload.settings),
  }

  if (strategy === 'overwrite') {
    if (scope) {
      // 只替换对应数据集，其余保持不变
      const current = await loadAll()
      const existing = await getAllAttachments()
      const attachmentMap = new Map(existing.map((record) => [record.id, record]))
      attachmentRecords.forEach((record) => attachmentMap.set(record.id, record))
      await bulkReplace({
        tasks: scope === 'tasks' ? tasks : current.tasks,
        notes: scope === 'notes' ? notes : current.notes,
        attendance: scope === 'attendance' ? attendance : current.attendance,
        summaries: scope === 'summaries' ? summaries : current.summaries,
        attachments: Array.from(attachmentMap.values()),
      })
      return result
    }
    await bulkReplace({ tasks, notes, attendance, summaries, attachments: attachmentRecords })
    return result
  }

  const current = await loadAll()
  const taskMap = new Map(current.tasks.map((task) => [task.id, task]))
  tasks.forEach((task) => {
    const old = taskMap.get(task.id)
    if (!old || task.updatedAt >= old.updatedAt) {
      // 不含附件的备份不能恢复附件，合并时保留本地已有附件，避免误删
      if (!payload.attachmentsIncluded && old) {
        const importedIds = new Set(task.attachments.map((meta) => meta.id))
        const kept = old.attachments.filter((meta) => !importedIds.has(meta.id))
        if (kept.length) task.attachments = [...task.attachments, ...kept]
      }
      taskMap.set(task.id, task)
    }
  })

  const noteMap = new Map(current.notes.map((note) => [note.id, note]))
  notes.forEach((note) => {
    const old = noteMap.get(note.id)
    if (!old || note.updatedAt >= old.updatedAt) noteMap.set(note.id, note)
  })

  const attendanceMap = new Map(current.attendance.map((record) => [`${record.date}|${record.period}`, record]))
  attendance.forEach((record) => attendanceMap.set(`${record.date}|${record.period}`, record))

  const summaryMap = new Map(current.summaries.map((item) => [item.date, item]))
  summaries.forEach((item) => {
    const old = summaryMap.get(item.date)
    if (!old || item.updatedAt >= old.updatedAt) summaryMap.set(item.date, item)
  })

  const existingAttachments = await getAllAttachments()
  const attachmentMap = new Map(existingAttachments.map((record) => [record.id, record]))
  attachmentRecords.forEach((record) => attachmentMap.set(record.id, record))

  await bulkReplace({
    tasks: Array.from(taskMap.values()),
    notes: Array.from(noteMap.values()),
    attendance: Array.from(attendanceMap.values()),
    summaries: Array.from(summaryMap.values()),
    attachments: Array.from(attachmentMap.values()),
  })

  return result
}
