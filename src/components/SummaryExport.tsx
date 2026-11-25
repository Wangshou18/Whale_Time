import { useEffect, useMemo, useState } from 'react'
import type { DailySummary } from '../types'
import { Modal } from './Modal'
import { Icon } from './Icons'
import { useApp } from '../store/AppStore'
import { downloadBlob } from '../utils/format'
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
} from '../utils/summary'

interface SummaryExportProps {
  open: boolean
  onClose: () => void
  summaries: DailySummary[]
  defaultYear: number
  defaultMonth: number
}

const FORMATS: SummaryFormat[] = ['md', 'txt', 'csv']
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

export function SummaryExport({ open, onClose, summaries, defaultYear, defaultMonth }: SummaryExportProps) {
  const { notify } = useApp()
  const [scope, setScope] = useState<SummaryScope>('month')
  const [format, setFormat] = useState<SummaryFormat>('md')
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)

  // 每次打开都对齐到当前浏览的月份，避免沿用上次的选择
  useEffect(() => {
    if (!open) return
    setYear(defaultYear)
    setMonth(defaultMonth)
  }, [open, defaultYear, defaultMonth])

  const years = useMemo(() => {
    const set = new Set<number>([defaultYear, new Date().getFullYear()])
    summaries.forEach((item) => set.add(Number(item.date.slice(0, 4))))
    return Array.from(set)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a)
  }, [summaries, defaultYear])

  const activeYear = years.includes(year) ? year : years[0]

  const bounds = scope === 'month' ? monthBounds(activeYear, month) : yearBounds(activeYear)
  const entries = useMemo(() => summariesInRange(summaries, bounds.from, bounds.to), [summaries, bounds.from, bounds.to])

  const title = scope === 'month' ? `${activeYear} 年 ${month + 1} 月工作总结` : `${activeYear} 年工作总结`
  const note =
    scope === 'month'
      ? `${bounds.from} 至 ${bounds.to}`
      : `${activeYear} 年 1 月 1 日至 12 月 31 日`
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
    const mime =
      format === 'csv' ? 'text/csv;charset=utf-8' : format === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8'
    downloadBlob(new Blob([doc], { type: mime }), filename)
    notify(`已导出 ${entries.length} 天总结（${SUMMARY_FORMAT_META[format].label}）`)
    onClose()
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
    <Modal
      open={open}
      onClose={onClose}
      title="导出工作总结"
      subtitle="按月份或按年份打包，文件在本机生成。"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <div className="modal-actions">
            <button type="button" className="btn btn-soft" onClick={handleCopy} disabled={!entries.length}>
              <Icon name="file" size={15} /> 复制全文
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={!entries.length}>
              <Icon name="download" size={15} /> 导出 {SUMMARY_FORMAT_META[format].label}
            </button>
          </div>
        </>
      }
    >
      <div className="rv-export">
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
      </div>
    </Modal>
  )
}
