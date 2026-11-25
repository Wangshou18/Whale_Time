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
} from '../types'
import { getAllAttachments, loadAll } from '../db/repository'
import { bulkReplace } from '../db/db'
import { loadSettings } from '../utils/settings'
import { filenameStamp } from '../utils/format'
import { countChars } from '../utils/summary'
import { nowISO } from '../utils/id'

export type ImportStrategy = 'merge' | 'overwrite'

const APP_ID = 'whale-work-assistant'

function buildPayload(
  tasks: Task[],
  notes: Note[],
  attendance: AttendanceRecord[],
  summaries: DailySummary[],
  attachmentsIncluded: boolean,
): BackupPayload {
  return {
    app: APP_ID,
    version: 2,
    exportedAt: nowISO(),
    attachmentsIncluded,
    settings: loadSettings(),
    tasks,
    notes,
    attendance,
    summaries,
  }
}

export async function exportBackup(includeAttachments: boolean): Promise<{ blob: Blob; filename: string }> {
  const { tasks, notes, attendance, summaries } = await loadAll()
  const stamp = filenameStamp()

  if (!includeAttachments) {
    const payload = buildPayload(
      tasks.map((task) => ({ ...task, attachments: [] })),
      notes,
      attendance,
      summaries,
      false,
    )
    return {
      blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
      filename: `jing-shi-backup-${stamp}.json`,
    }
  }

  const attachments = await getAllAttachments()
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(buildPayload(tasks, notes, attendance, summaries, true), null, 2))
  zip.file(
    'README.txt',
    [
      '鲸时 · 个人工作助手 数据备份',
      '',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `任务：${tasks.length} 条，笔记：${notes.length} 条，考勤：${attendance.length} 条，总结：${summaries.length} 天，附件：${attachments.length} 个`,
      '',
      'data.json 为结构化数据，attachments/ 目录内为原始附件（文件名为附件 ID）。',
      '请将整个压缩包妥善保存，导入时选择此文件即可恢复全部数据。',
    ].join('\n'),
  )
  attachments.forEach((record) => zip.file(`attachments/${record.id}`, record.blob))

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return { blob, filename: `jing-shi-backup-${stamp}.zip` }
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function csvFromRows(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export async function exportCsvBundle(): Promise<{ blob: Blob; filename: string }> {
  const { tasks, notes, attendance, summaries } = await loadAll()
  const taskRows: unknown[][] = [['标题', '状态', '优先级', '开始日期', '截止日期', '标签', '完成时间', '创建时间', '内容']]
  const priorityLabel = { urgent: '紧急', high: '高', medium: '中', low: '低' } as const
  tasks.forEach((task) => {
    taskRows.push([
      task.title,
      task.status === 'done' ? '已完成' : '未完成',
      priorityLabel[task.priority],
      task.startDate,
      task.dueDate ?? '',
      task.tags.join(' / '),
      task.completedAt ?? '',
      task.createdAt,
      task.content,
    ])
  })

  const noteRows: unknown[][] = [['标题', '标签', '关联日期', '创建时间', '更新时间', '内容']]
  notes.forEach((note) => {
    noteRows.push([note.title, note.tags.join(' / '), note.date ?? '', note.createdAt, note.updatedAt, note.content])
  })

  const attendanceRows: unknown[][] = [['日期', '时段', '状态', '记录时间']]
  attendance.forEach((record) => {
    attendanceRows.push([
      record.date,
      record.period === 'am' ? '上午' : record.period === 'pm' ? '下午' : '全天',
      record.type === 'work' ? '已打卡' : '休息',
      record.createdAt,
    ])
  })

  const zip = new JSZip()
  zip.file('tasks.csv', csvFromRows(taskRows))
  zip.file('notes.csv', csvFromRows(noteRows))
  zip.file('attendance.csv', csvFromRows(attendanceRows))

  const summaryRows: unknown[][] = [['日期', '字数', '内容']]
  summaries.forEach((summary) => {
    summaryRows.push([summary.date, countChars(summary.content), summary.content])
  })
  zip.file('summaries.csv', csvFromRows(summaryRows))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return { blob, filename: `jing-shi-csv-${filenameStamp()}.zip` }
}

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
      ? raw.attachments.filter((item): item is AttachmentMeta => !!item && typeof item.id === 'string' && typeof item.name === 'string')
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
    reminderDays: typeof value.reminderDays === 'number' ? Math.max(0, Math.min(30, Math.round(value.reminderDays))) : 3,
  }
}

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
    payload = JSON.parse(await file.text()) as Partial<BackupPayload>
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

  const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : []
  const rawNotes = Array.isArray(payload.notes) ? payload.notes : []
  const rawAttendance = Array.isArray(payload.attendance) ? payload.attendance : []
  const rawSummaries = Array.isArray(payload.summaries) ? payload.summaries : []

  const tasks = rawTasks.map((item) => normalizeTask(item as Partial<Task>))
  const notes = rawNotes.map((item) => normalizeNote(item as Partial<Note>))
  const attendance = rawAttendance
    .map((item) => normalizeAttendance(item as Partial<AttendanceRecord>))
    .filter((item): item is AttendanceRecord => !!item)
  const summaries = rawSummaries
    .map((item) => normalizeSummary(item as Partial<DailySummary>))
    .filter((item): item is DailySummary => !!item)

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

  if (strategy === 'overwrite') {
    await bulkReplace({ tasks, notes, attendance, summaries, attachments: attachmentRecords })
    return {
      tasks: tasks.length,
      notes: notes.length,
      attendance: attendance.length,
      summaries: summaries.length,
      attachments: attachmentRecords.length,
      settings: validSettings(payload.settings),
    }
  }

  const current = await loadAll()
  const taskMap = new Map(current.tasks.map((task) => [task.id, task]))
  tasks.forEach((task) => {
    const old = taskMap.get(task.id)
    if (!old || task.updatedAt >= old.updatedAt) {
      // 不含附件的 JSON 备份不能恢复附件，合并时保留本地已有附件，避免误删
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

  const mergedTasks = Array.from(taskMap.values())
  const mergedNotes = Array.from(noteMap.values())
  const mergedAttendance = Array.from(attendanceMap.values())
  const mergedSummaries = Array.from(summaryMap.values())
  await bulkReplace({
    tasks: mergedTasks,
    notes: mergedNotes,
    attendance: mergedAttendance,
    summaries: mergedSummaries,
    attachments: await getAllAttachments().then((existing) => {
      const map = new Map(existing.map((record) => [record.id, record]))
      attachmentRecords.forEach((record) => map.set(record.id, record))
      return Array.from(map.values())
    }),
  })

  return {
    tasks: tasks.length,
    notes: notes.length,
    attendance: attendance.length,
    summaries: summaries.length,
    attachments: attachmentRecords.length,
  }
}
