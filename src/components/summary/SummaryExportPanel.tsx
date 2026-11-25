import { useMemo, useState } from 'react'
import type { DailySummary } from '../../types'
import { Icon } from '../Icons'
import { useApp } from '../../store/AppStore'
import { downloadBlob } from '../../utils/format'
import {
  SUMMARY_FORMAT_META,
  buildSummaryCsv,
  buildSummaryMarkdown,
  buildSummaryText,
  countChars,
  monthBounds,
  summaryFileName,
  summariesInRange,
  yearBounds,
  type SummaryFormat,
  type SummaryScope,
} from '../../utils/summary'

const FORMATS: SummaryFormat[] = ['md', 'txt', 'csv']
const MONTHS = Array.from({ length: 12 }, (_, index) => index)
const MIME: Record<SummaryFormat, string> = {
  md: 'text/markdown;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
}

export interface SummaryExportPanelProps {
  summaries: DailySummary[]
  defaultYear?: number
  defaultMonth?: number
  /** 紧凑模式：嵌在页面卡片里时使用 */
  compact?: boolean
  onExported?: (info: { filename: string; days: number; format: SummaryFormat }) => void
}

/**
 * 工作总结导出面板：范围（月/年）→ 格式 → 预览 → 导出。
 * 可嵌入任意页面，也被总结页的弹窗复用。
 */
export function SummaryExportPanel({ summaries, defaultYear, defaultMonth, compact, onExported }: SummaryExportPanelProps) {
  const { notify } = useApp()
  const [scope, setScope] = useState<SummaryScope>('month')
  const [format, setFormat] = useState<SummaryFormat>('md')
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear())
  const [month, setMonth] = useState(defaultMonth ?? new Date().getMonth())
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const years = useMemo(() => {
    const set = new Set<number>([currentYear])
    if (defaultYear) set.add(defaultYear)
    summaries.forEach((item) => set.add(Number(item.date.slice(0, 4))))
    return Array.from(set)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a)
  }, [summaries, defaultYear, currentYear])

  const activeYear = years.includes(year) ? year : years[0]

  const bounds = scope === 'month' ? monthBounds(activeYear, month) : yearBounds(activeYear)
  const entries = useMemo(() => summariesInRange(summaries, bounds.from, bounds.to), [summaries, bounds.from, bounds.to])

  const title = scope === 'month' ? `${activeYear} 年 ${month + 1} 月工作总结` : `${activeYear} 年工作总结`
  const note = scope === 'month' ? `${bounds.from} 至 ${bounds.to}` : `${activeYear} 年 1 月 1 日至 12 月 31 日`
  const options = { title, note, groupByMonth: scope === 'year' }

  const doc = useMemo(() => {
    if (format === 'csv') return buildSummaryCsv(entries)
    if (format === 'txt') return buildSummaryText(entries, options)
    return buildSummaryMarkdown(entries, options)
  }, [entries, format, title, note, scope])

  const filename = summaryFileName(scope, activeYear, month, format)
  const chars = entries.reduce((sum, item) => sum + countChars(item.content), 0)
  const preview = entries.length ? `${doc.length > 1400 ? `${doc.slice(0, 1400)}\n…` : doc}` : ''

  const handleDownload = () => {
    if (!entries.length) {
      notify('这个范围还没有总结记录', 'error')
      return
    }
    downloadBlob(new Blob([doc], { type: MIME[format] }), filename)
    notify(`已导出 ${entries.length} 天总结（${SUMMARY_FORMAT_META[format].label}）`)
    onExported?.({ filename, days: entries.length, format })
  }

  const handleCopy = async () => {
    if (!entries.length) {
      notify('这个范围还没有总结记录', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(doc)
      notify('已复制到剪贴板')
    } catch {
      notify('浏览器拒绝了剪贴板访问，请改用导出文件', 'error')
    }
  }

  return (
    <div className={`rv-export ${compact ? 'rv-export-compact' : ''}`}>
      <div className="rv-export-row">
        <span className="field-label">导出范围</span>
        <div className="segmented">
          <button type="button" className={scope === 'month' ? 'active' : ''} onClick={() => setScope('month')}>
            按月
          </button>
          <button type="button" className={scope === 'year' ? 'active' : ''} onClick={() => setScope('year')}>
            按年
          </button>
        </div>
      </div>

      <div className="rv-export-row">
        <span className="field-label">{scope === 'month' ? '选择月份' : '选择年份'}</span>
        <div className="rv-export-selects">
          <select className="input select-sm" value={activeYear} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((value) => (
              <option key={value} value={value}>
                {value} 年
              </option>
            ))}
          </select>
          {scope === 'month' ? (
            <select className="input select-sm" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((value) => (
                <option key={value} value={value}>
                  {value + 1} 月
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="rv-export-row">
        <span className="field-label">文件格式</span>
        <div className="rv-format-options">
          {FORMATS.map((value) => (
            <button
              key={value}
              type="button"
              className={`rv-format ${format === value ? 'active' : ''}`}
              onClick={() => setFormat(value)}
            >
              <strong>{SUMMARY_FORMAT_META[value].label}</strong>
              <em>{SUMMARY_FORMAT_META[value].hint}</em>
              <span className="mono">.{SUMMARY_FORMAT_META[value].ext}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rv-preview-wrap">
        <div className="rv-preview-head">
          <span>
            <strong>{entries.length}</strong> 天记录 · <strong>{chars.toLocaleString('zh-CN')}</strong> 字
          </span>
          <span className="mono rv-file-name">{filename}</span>
        </div>
        {entries.length ? (
          <pre className="rv-preview">{preview}</pre>
        ) : (
          <div className="rv-preview rv-preview-empty">
            <Icon name="inbox" size={20} />
            <span>{scope === 'month' ? '这个月还没有记录，换个范围试试。' : '这一年还没有记录。'}</span>
          </div>
        )}
      </div>

      <div className="rv-export-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopy} disabled={!entries.length}>
          <Icon name="file" size={15} /> 复制全文
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleDownload} disabled={!entries.length}>
          <Icon name="download" size={15} /> 导出 {SUMMARY_FORMAT_META[format].label}
        </button>
      </div>
    </div>
  )
}
