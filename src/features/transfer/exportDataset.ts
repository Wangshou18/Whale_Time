import type { AttachmentRecord } from '../../types'
import { filenameStamp } from '../../utils/format'
import {
  SUMMARY_FORMAT_META,
  buildSummaryCsv,
  buildSummaryMarkdown,
  buildSummaryText,
  monthBounds,
  summaryFileName,
  summariesInRange,
  yearBounds,
  type SummaryFormat,
  type SummaryScope,
} from '../../utils/summary'
import { FORMAT_META } from './datasets'
import {
  buildAttachmentsCsv,
  buildAttachmentsJson,
  buildAttendanceCsv,
  buildAttendanceMarkdown,
  buildDatasetJson,
  buildNotesCsv,
  buildNotesMarkdown,
  buildTasksCsv,
  buildTasksMarkdown,
} from './serialize'
import type { DataSnapshot, DatasetKey, ExportFormat, ExportResult, SummaryRange } from './types'

function file(key: string, ext: string): string {
  return `jing-shi-${key}-${filenameStamp()}.${ext}`
}

function textResult(content: string, filename: string, format: ExportFormat, records: number, label: string): ExportResult {
  return {
    blob: new Blob([content], { type: FORMAT_META[format].mime }),
    filename,
    records,
    label,
  }
}

function summariesExport(
  snapshot: DataSnapshot,
  format: ExportFormat,
  range?: SummaryRange,
): ExportResult {
  const entries = range
    ? summariesInRange(
        snapshot.summaries,
        range.scope === 'month' ? monthBounds(range.year, range.month).from : yearBounds(range.year).from,
        range.scope === 'month' ? monthBounds(range.year, range.month).to : yearBounds(range.year).to,
      )
    : summariesInRange(snapshot.summaries, '0000-01-01', '9999-12-31')

  const scope: SummaryScope = range?.scope ?? 'year'
  const year = range?.year ?? new Date().getFullYear()
  const month = range?.month ?? new Date().getMonth()
  const title = range
    ? scope === 'month'
      ? `${year} 年 ${month + 1} 月工作总结`
      : `${year} 年工作总结`
    : `工作总结（全部 ${entries.length} 天）`
  const note = range
    ? scope === 'month'
      ? `${monthBounds(year, month).from} 至 ${monthBounds(year, month).to}`
      : `${year} 年 1 月 1 日至 12 月 31 日`
    : '全部记录'
  const options = { title, note, groupByMonth: scope === 'year' }

  if (format === 'json') {
    return textResult(
      buildDatasetJson('summaries', snapshot, undefined),
      file('summaries', 'json'),
      'json',
      entries.length,
      '数据 JSON',
    )
  }

  const doc =
    format === 'csv'
      ? buildSummaryCsv(entries)
      : format === 'txt'
        ? buildSummaryText(entries, options)
        : buildSummaryMarkdown(entries, options)

  const fmt = (['md', 'txt', 'csv'].includes(format) ? format : 'md') as SummaryFormat
  const filename = range ? summaryFileName(scope, year, month, fmt) : file('summaries', fmt)
  return textResult(doc, filename, fmt, entries.length, SUMMARY_FORMAT_META[fmt].label)
}

/** 单数据集导出 */
export function buildDatasetExport(
  key: DatasetKey,
  format: ExportFormat,
  snapshot: DataSnapshot,
  attachments: AttachmentRecord[],
  range?: SummaryRange,
): ExportResult {
  if (key === 'summaries') return summariesExport(snapshot, format, range)

  if (key === 'tasks') {
    const title = '任务清单'
    if (format === 'csv') return textResult(buildTasksCsv(snapshot.tasks), file('tasks', 'csv'), 'csv', snapshot.tasks.length, 'CSV 表格')
    if (format === 'md') return textResult(buildTasksMarkdown(snapshot.tasks, title), file('tasks', 'md'), 'md', snapshot.tasks.length, 'Markdown')
    return textResult(buildDatasetJson('tasks', snapshot, undefined), file('tasks', 'json'), 'json', snapshot.tasks.length, '数据 JSON')
  }

  if (key === 'notes') {
    if (format === 'csv') return textResult(buildNotesCsv(snapshot.notes), file('notes', 'csv'), 'csv', snapshot.notes.length, 'CSV 表格')
    if (format === 'md') return textResult(buildNotesMarkdown(snapshot.notes, '笔记归档'), file('notes', 'md'), 'md', snapshot.notes.length, 'Markdown')
    return textResult(buildDatasetJson('notes', snapshot, undefined), file('notes', 'json'), 'json', snapshot.notes.length, '数据 JSON')
  }

  if (key === 'attendance') {
    if (format === 'csv')
      return textResult(buildAttendanceCsv(snapshot.attendance), file('attendance', 'csv'), 'csv', snapshot.attendance.length, 'CSV 表格')
    if (format === 'md')
      return textResult(buildAttendanceMarkdown(snapshot.attendance, '考勤记录'), file('attendance', 'md'), 'md', snapshot.attendance.length, 'Markdown')
    return textResult(
      buildDatasetJson('attendance', snapshot, undefined),
      file('attendance', 'json'),
      'json',
      snapshot.attendance.length,
      '数据 JSON',
    )
  }

  // attachments
  if (format === 'csv')
    return textResult(buildAttachmentsCsv(attachments), file('attachments', 'csv'), 'csv', attachments.length, 'CSV 清单')
  return textResult(buildAttachmentsJson(snapshot, attachments), file('attachments', 'json'), 'json', attachments.length, '附件清单')
}
