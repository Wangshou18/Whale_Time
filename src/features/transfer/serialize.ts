import type { AttachmentRecord, Note, Task } from '../../types'
import { ATTENDANCE_LABEL, PERIOD_LABEL, PRIORITY_META } from '../../types'
import { csvFromRows } from './csv'
import { APP_ID } from './datasets'
import type { DataSnapshot, DatasetKey } from './types'

function indent(text: string, prefix = '  '): string {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join('\n')
}

/* ------------------------------ 任务 ------------------------------ */

export function buildTasksCsv(tasks: Task[]): string {
  const rows: unknown[][] = [
    ['标题', '状态', '优先级', '开始日期', '截止日期', '标签', '完成时间', '创建时间', '更新时间', '附件数', '内容'],
  ]
  tasks.forEach((task) => {
    rows.push([
      task.title,
      task.status === 'done' ? '已完成' : '未完成',
      PRIORITY_META[task.priority].label,
      task.startDate,
      task.dueDate ?? '',
      task.tags.join(' / '),
      task.completedAt ?? '',
      task.createdAt,
      task.updatedAt,
      task.attachments.length,
      task.content,
    ])
  })
  return csvFromRows(rows)
}

export function buildTasksMarkdown(tasks: Task[], title: string): string {
  const groups: { key: string; label: string; items: Task[] }[] = [
    { key: 'todo', label: '未完成', items: tasks.filter((task) => task.status !== 'done') },
    { key: 'done', label: '已完成', items: tasks.filter((task) => task.status === 'done') },
  ]

  const lines: string[] = [`# ${title}`, '', `> 共 ${tasks.length} 条任务 · 导出时间 ${new Date().toLocaleString('zh-CN')}`, '']

  groups.forEach((group) => {
    if (!group.items.length) return
    lines.push(`## ${group.label}（${group.items.length}）`, '')
    group.items.forEach((task) => {
      const box = task.status === 'done' ? '[x]' : '[ ]'
      lines.push(`### ${box} ${task.title}`, '')
      const meta = [`优先级 ${PRIORITY_META[task.priority].label}`, `开始 ${task.startDate}`]
      if (task.dueDate) meta.push(`截止 ${task.dueDate}`)
      if (task.completedAt) meta.push(`完成于 ${task.completedAt.slice(0, 10)}`)
      if (task.attachments.length) meta.push(`附件 ${task.attachments.length} 个`)
      lines.push(`- ${meta.join(' ｜ ')}`)
      if (task.tags.length) lines.push(`- 标签：${task.tags.map((tag) => `#${tag}`).join(' ')}`)
      if (task.content.trim()) {
        lines.push('', indent(task.content.trim()))
      }
      lines.push('')
    })
  })

  if (!tasks.length) lines.push('_还没有任务记录。_', '')
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

/* ------------------------------ 笔记 ------------------------------ */

export function buildNotesCsv(notes: Note[]): string {
  const rows: unknown[][] = [['标题', '标签', '关联日期', '创建时间', '更新时间', '内容']]
  notes.forEach((note) => {
    rows.push([note.title, note.tags.join(' / '), note.date ?? '', note.createdAt, note.updatedAt, note.content])
  })
  return csvFromRows(rows)
}

export function buildNotesMarkdown(notes: Note[], title: string): string {
  const lines: string[] = [`# ${title}`, '', `> 共 ${notes.length} 篇笔记 · 导出时间 ${new Date().toLocaleString('zh-CN')}`, '']
  if (!notes.length) {
    lines.push('_还没有笔记。_')
    return `${lines.join('\n')}\n`
  }
  notes.forEach((note) => {
    lines.push(`## ${note.title}`, '')
    const meta = [`更新于 ${note.updatedAt.slice(0, 16).replace('T', ' ')}`]
    if (note.date) meta.push(`关联日期 ${note.date}`)
    if (note.tags.length) meta.push(note.tags.map((tag) => `#${tag}`).join(' '))
    lines.push(`> ${meta.join(' · ')}`, '')
    if (note.content.trim()) lines.push(note.content.trim(), '')
    lines.push('---', '')
  })
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

/* ------------------------------ 考勤 ------------------------------ */

type AttendanceLike = { date: string; period: 'am' | 'pm' | 'full'; type: 'work' | 'rest'; createdAt: string }

export function buildAttendanceCsv(records: AttendanceLike[]): string {
  const rows: unknown[][] = [['日期', '时段', '状态', '记录时间']]
  records.forEach((record) => {
    rows.push([record.date, PERIOD_LABEL[record.period], ATTENDANCE_LABEL[record.type], record.createdAt])
  })
  return csvFromRows(rows)
}

export function buildAttendanceMarkdown(records: AttendanceLike[], title: string): string {
  const workDays = new Set(records.filter((record) => record.type === 'work').map((record) => record.date)).size
  const lines: string[] = [
    `# ${title}`,
    '',
    `> 共 ${records.length} 条记录 · 覆盖 ${workDays} 个工作日`,
    '',
    '| 日期 | 时段 | 状态 |',
    '| --- | --- | --- |',
  ]
  if (!records.length) {
    lines.push('| — | — | 暂无记录 |')
  } else {
    records.forEach((record) => {
      lines.push(`| ${record.date} | ${PERIOD_LABEL[record.period]} | ${ATTENDANCE_LABEL[record.type]} |`)
    })
  }
  return `${lines.join('\n')}\n`
}

/* ------------------------------ 附件 ------------------------------ */

export function buildAttachmentsCsv(records: AttachmentRecord[]): string {
  const rows: unknown[][] = [['文件名', '类型', '体积(字节)', '所属任务', '创建时间']]
  records.forEach((record) => {
    rows.push([record.name, record.type, record.size, record.taskId, record.createdAt])
  })
  return csvFromRows(rows)
}

/* ------------------------------ JSON ------------------------------ */

/**
 * 单数据集 JSON：只带该数据集字段，并写入 scope。
 * 导入时按 scope 只替换对应表，不会误伤其他数据。
 */
export function buildDatasetJson(key: DatasetKey, snapshot: DataSnapshot, settings: unknown): string {
  const base = {
    app: APP_ID,
    version: 2,
    exportedAt: new Date().toISOString(),
    scope: key,
    attachmentsIncluded: false,
    settings,
    tasks: [] as Task[],
    notes: [] as Note[],
    attendance: [],
    summaries: [],
  }
  const payload: Record<string, unknown> = { ...base }
  delete payload.tasks
  delete payload.notes
  delete payload.attendance
  delete payload.summaries

  if (key === 'tasks') payload.tasks = snapshot.tasks.map((task) => ({ ...task, attachments: [] as unknown[] }))
  if (key === 'notes') payload.notes = snapshot.notes
  if (key === 'attendance') payload.attendance = snapshot.attendance
  if (key === 'summaries') payload.summaries = snapshot.summaries

  return JSON.stringify(payload, null, 2)
}

/** 附件清单 JSON（不含文件本体） */
export function buildAttachmentsJson(snapshot: DataSnapshot, attachmentRecords: AttachmentRecord[]): string {
  return JSON.stringify(
    {
      app: APP_ID,
      version: 2,
      exportedAt: new Date().toISOString(),
      scope: 'attachments',
      attachmentsIncluded: false,
      manifest: attachmentRecords.map(({ blob: _blob, ...meta }) => meta),
      count: snapshot.attachmentCount,
    },
    null,
    2,
  )
}
