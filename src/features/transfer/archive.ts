import JSZip from 'jszip'
import type { AttachmentRecord, BackupPayload } from '../../types'
import { getAllAttachments, loadAll } from '../../db/repository'
import { loadSettings } from '../../utils/settings'
import { filenameStamp } from '../../utils/format'
import { nowISO } from '../../utils/id'
import { countChars } from '../../utils/summary'
import { csvFromRows } from './csv'
import { APP_ID } from './datasets'
import { buildAttendanceCsv, buildNotesCsv, buildTasksCsv } from './serialize'
import type { DataSnapshot, ExportResult } from './types'

/** 读取当前全部数据，作为打包的事实来源 */
export async function readSnapshot(): Promise<{ snapshot: DataSnapshot; attachments: AttachmentRecord[] }> {
  const [{ tasks, notes, attendance, summaries }, attachments] = await Promise.all([loadAll(), getAllAttachments()])
  return {
    snapshot: {
      tasks,
      notes,
      attendance,
      summaries,
      attachmentCount: attachments.length,
      attachmentBytes: attachments.reduce((sum, record) => sum + (record.size || 0), 0),
    },
    attachments,
  }
}

function buildPayload(snapshot: DataSnapshot, includeAttachments: boolean): BackupPayload {
  return {
    app: APP_ID,
    version: 2,
    exportedAt: nowISO(),
    attachmentsIncluded: includeAttachments,
    settings: loadSettings(),
    tasks: includeAttachments ? snapshot.tasks : snapshot.tasks.map((task) => ({ ...task, attachments: [] })),
    notes: snapshot.notes,
    attendance: snapshot.attendance,
    summaries: snapshot.summaries,
  }
}

function totalRecords(snapshot: DataSnapshot): number {
  return snapshot.tasks.length + snapshot.notes.length + snapshot.attendance.length + snapshot.summaries.length
}

/** 轻量备份：结构化 JSON，不含附件文件 */
export function buildLightBackup(snapshot: DataSnapshot): ExportResult {
  const payload = buildPayload(snapshot, false)
  return {
    blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    filename: `jing-shi-backup-${filenameStamp()}.json`,
    records: totalRecords(snapshot),
    label: '完整性备份（不含附件）',
  }
}

/** 完整备份：data.json + attachments/ + README.txt */
export async function buildFullBackup(snapshot: DataSnapshot, attachments: AttachmentRecord[]): Promise<ExportResult> {
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(buildPayload(snapshot, true), null, 2))
  zip.file(
    'README.txt',
    [
      '鲸时 · 个人工作助手 数据备份',
      '',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `任务：${snapshot.tasks.length} 条，笔记：${snapshot.notes.length} 条，考勤：${snapshot.attendance.length} 条，总结：${snapshot.summaries.length} 天，附件：${attachments.length} 个`,
      '',
      'data.json 为结构化数据，attachments/ 目录内为原始附件（文件名为附件 ID）。',
      '导入方式：数据打包 → 导入数据 → 选择此压缩包。',
    ].join('\n'),
  )
  attachments.forEach((record) => zip.file(`attachments/${record.id}`, record.blob))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  return {
    blob,
    filename: `jing-shi-backup-${filenameStamp()}.zip`,
    records: totalRecords(snapshot) + attachments.length,
    label: '完整备份（含附件）',
  }
}

/** CSV 表格包：四张表，便于在表格软件里分析 */
export async function buildCsvPackage(snapshot: DataSnapshot): Promise<ExportResult> {
  const zip = new JSZip()
  zip.file('tasks.csv', buildTasksCsv(snapshot.tasks))
  zip.file('notes.csv', buildNotesCsv(snapshot.notes))
  zip.file('attendance.csv', buildAttendanceCsv(snapshot.attendance))

  const summaryRows: unknown[][] = [['日期', '字数', '内容']]
  snapshot.summaries.forEach((summary) => {
    summaryRows.push([summary.date, countChars(summary.content), summary.content])
  })
  zip.file('summaries.csv', csvFromRows(summaryRows))
  zip.file(
    'README.txt',
    ['鲸时 · CSV 表格包', '', `导出时间：${new Date().toLocaleString('zh-CN')}`, '', 'tasks / notes / attendance / summaries 四个表格，均为 UTF-8 带 BOM，Excel 可直接打开。'].join(
      '\n',
    ),
  )

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return {
    blob,
    filename: `jing-shi-csv-${filenameStamp()}.zip`,
    records: totalRecords(snapshot),
    label: 'CSV 表格包',
  }
}
