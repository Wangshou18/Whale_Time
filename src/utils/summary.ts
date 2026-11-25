import type { DailySummary } from '../types'
import { addDaysISO, endOfMonthISO, fromISO, pad2, weekdayName } from './date'

/** 字数统计：忽略空白字符，中英文都按字符计 */
export function countChars(text: string): number {
  return text.replace(/\s+/g, '').length
}

export function summariesInRange(summaries: DailySummary[], from: string, to: string): DailySummary[] {
  return summaries
    .filter((item) => item.date >= from && item.date <= to && item.content.trim())
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  return { from: `${year}-${pad2(month + 1)}-01`, to: endOfMonthISO(year, month) }
}

export function yearBounds(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** 连续记录天数：从今天（今天没写则从昨天）向前数 */
export function summaryStreak(summaries: DailySummary[], today: string): number {
  const written = new Set(summaries.filter((item) => item.content.trim()).map((item) => item.date))
  let cursor = written.has(today) ? today : addDaysISO(today, -1)
  let count = 0
  while (written.has(cursor)) {
    count += 1
    cursor = addDaysISO(cursor, -1)
  }
  return count
}

export function dayHeading(iso: string): string {
  const date = fromISO(iso)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${weekdayName(iso)}`
}

export interface SummaryDocOptions {
  title: string
  /** 附加在概要行里的说明，例如导出范围 */
  note?: string
  /** 年度导出时按月份分组 */
  groupByMonth?: boolean
}

function docMeta(entries: DailySummary[]): string {
  const chars = entries.reduce((sum, item) => sum + countChars(item.content), 0)
  return `记录 ${entries.length} 天 · 共 ${chars.toLocaleString('zh-CN')} 字`
}

export function buildSummaryMarkdown(entries: DailySummary[], options: SummaryDocOptions): string {
  const lines: string[] = [`# ${options.title}`, '']
  lines.push(`> ${[docMeta(entries), options.note].filter(Boolean).join(' · ')}`, '')

  if (!entries.length) {
    lines.push('_这个范围内还没有记录。_')
    return `${lines.join('\n')}\n`
  }

  let currentMonth = ''
  entries.forEach((entry, index) => {
    if (options.groupByMonth) {
      const monthKey = entry.date.slice(0, 7)
      if (monthKey !== currentMonth) {
        currentMonth = monthKey
        const date = fromISO(entry.date)
        lines.push(`## ${date.getFullYear()} 年 ${date.getMonth() + 1} 月`, '')
      }
    }
    const level = options.groupByMonth ? '###' : '##'
    lines.push(`${level} ${dayHeading(entry.date)}`, '', entry.content.trim(), '')
    if (index < entries.length - 1) lines.push('---', '')
    else lines.push('')
  })

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function buildSummaryText(entries: DailySummary[], options: SummaryDocOptions): string {
  const heavy = '='.repeat(38)
  const light = '-'.repeat(38)
  const lines: string[] = [options.title, heavy, docMeta(entries)]
  if (options.note) lines.push(options.note)
  lines.push('')

  if (!entries.length) {
    lines.push('这个范围内还没有记录。')
    return `${lines.join('\n')}\n`
  }

  let currentMonth = ''
  entries.forEach((entry) => {
    if (options.groupByMonth) {
      const monthKey = entry.date.slice(0, 7)
      if (monthKey !== currentMonth) {
        currentMonth = monthKey
        const date = fromISO(entry.date)
        lines.push(`【${date.getFullYear()} 年 ${date.getMonth() + 1} 月】`, '')
      }
    }
    lines.push(light, dayHeading(entry.date), light, entry.content.trim(), '')
  })

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function buildSummaryCsv(entries: DailySummary[]): string {
  const rows: unknown[][] = [['日期', '星期', '字数', '内容']]
  entries.forEach((entry) => {
    rows.push([entry.date, weekdayName(entry.date), countChars(entry.content), entry.content])
  })
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export type SummaryScope = 'month' | 'year'
export type SummaryFormat = 'md' | 'txt' | 'csv'

export const SUMMARY_FORMAT_META: Record<SummaryFormat, { label: string; ext: string; hint: string }> = {
  md: { label: 'Markdown', ext: 'md', hint: '带标题层级，可直接贴进周报或知识库。' },
  txt: { label: '纯文本', ext: 'txt', hint: '无格式符号，适合直接打印或贴进聊天框。' },
  csv: { label: 'CSV 表格', ext: 'csv', hint: '一行一天，方便在表格软件里筛选与统计。' },
}

export function summaryFileName(scope: SummaryScope, year: number, month: number, format: SummaryFormat): string {
  const ext = SUMMARY_FORMAT_META[format].ext
  return scope === 'month'
    ? `jing-shi-summary-${year}-${pad2(month + 1)}.${ext}`
    : `jing-shi-summary-${year}.${ext}`
}
