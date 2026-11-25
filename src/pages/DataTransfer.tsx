import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AttachmentRecord, ImportResult } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { Icon } from '../components/Icons'
import { SummaryExportPanel } from '../components/summary/SummaryExportPanel'
import { getAllAttachments } from '../db/repository'
import { downloadBlob, formatBytes } from '../utils/format'
import {
  DATASETS,
  DATASET_MAP,
  FORMAT_META,
  clearTransferLog,
  lastExportEntry,
  loadTransferLog,
  pushTransferLog,
  runExport,
  type DatasetKey,
  type ExportFormat,
  type ExportRequest,
  type ImportStrategy,
  type TransferLogEntry,
} from '../features/transfer'

const OVERALL_CHOICES: { format: ExportFormat; title: string; desc: string; icon: 'hardDrive' | 'database' | 'text' }[] = [
  {
    format: 'zip',
    title: '完整备份 ZIP',
    desc: '结构化数据 + 全部附件原始文件，可在任何地址完整恢复。',
    icon: 'hardDrive',
  },
  {
    format: 'json',
    title: '轻量备份 JSON',
    desc: '任务、笔记、考勤、总结与设置，体积小，不含附件。',
    icon: 'database',
  },
  {
    format: 'csv',
    title: 'CSV 表格包',
    desc: '四张 CSV 表格，方便在 Excel 里筛选、透视与统计。',
    icon: 'text',
  },
]

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(then).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function DataTransferPage() {
  const { tasks, notes, attendance, summaries, notify, importData } = useApp()
  const { confirm, navigate } = useUI()

  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [log, setLog] = useState<TransferLogEntry[]>(() => loadTransferLog())
  const [busy, setBusy] = useState<string | null>(null)
  const [datasetKey, setDatasetKey] = useState<DatasetKey>('tasks')
  const [datasetFormat, setDatasetFormat] = useState<ExportFormat>('csv')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>('merge')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadAttachments = useCallback(async () => {
    try {
      setAttachments(await getAllAttachments())
    } catch {
      setAttachments([])
    }
  }, [])

  useEffect(() => {
    void loadAttachments()
  }, [loadAttachments])

  const counts = useMemo<Record<DatasetKey, number>>(
    () => ({
      tasks: tasks.length,
      notes: notes.length,
      attendance: attendance.length,
      summaries: summaries.length,
      attachments: attachments.length,
    }),
    [tasks.length, notes.length, attendance.length, summaries.length, attachments.length],
  )

  const attachmentBytes = attachments.reduce((sum, record) => sum + (record.size || 0), 0)
  const descriptor = DATASET_MAP[datasetKey]
  const lastExport = lastExportEntry(log)
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : 'file://'

  const performExport = async (request: ExportRequest, busyKey: string) => {
    setBusy(busyKey)
    try {
      const result = await runExport(request)
      downloadBlob(result.blob, result.filename)
      setLog(pushTransferLog({ kind: 'export', label: result.label, filename: result.filename, records: result.records }))
      notify(`已导出${result.label}：${result.records} 条记录`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '导出失败，请重试', 'error')
    } finally {
      setBusy(null)
    }
  }

  const selectDataset = (key: DatasetKey) => {
    setDatasetKey(key)
    setDatasetFormat(DATASET_MAP[key].formats[0])
  }

  const handleImport = async () => {
    if (!importFile) {
      notify('请先选择备份文件', 'error')
      return
    }
    if (strategy === 'overwrite') {
      const ok = await confirm({
        title: '覆盖现有数据？',
        message:
          '覆盖会先清空当前任务、笔记、考勤、总结和附件，再完整导入备份内容。此操作不可撤销，建议先导出一份完整备份。',
        confirmText: '继续覆盖',
        danger: true,
      })
      if (!ok) return
    }
    setBusy('import')
    try {
      const result = await importData(importFile, strategy)
      setImportResult(result)
      setLog(
        pushTransferLog({
          kind: 'import',
          label: strategy === 'overwrite' ? '覆盖导入' : '合并导入',
          filename: importFile.name,
          records: result.tasks + result.notes + result.attendance + result.summaries + result.attachments,
        }),
      )
      notify(
        `导入完成：${result.tasks} 个任务、${result.notes} 篇笔记、${result.attendance} 条考勤、${result.summaries} 天总结、${result.attachments} 个附件`,
      )
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await loadAttachments()
    } catch (error) {
      notify(error instanceof Error ? error.message : '导入失败，请检查文件格式', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="transfer-page">
      <section className="card transfer-hero">
        <div className="transfer-hero-main">
          <span className="transfer-hero-icon">
            <Icon name="package" size={24} />
          </span>
          <div>
            <h2>数据打包中心</h2>
            <p>导出、备份与恢复都在本机完成，不经过任何网络请求。</p>
          </div>
        </div>
        <div className="transfer-counts">
          {DATASETS.map((item) => (
            <div className="transfer-count" key={item.key}>
              <span>
                <Icon name={item.icon} size={14} /> {item.label}
              </span>
              <strong>{counts[item.key]}</strong>
            </div>
          ))}
        </div>
        <div className="transfer-meta">
          <span>
            当前地址 <code>{currentOrigin}</code>
          </span>
          <span>{lastExport ? `上次导出 ${relativeTime(lastExport.at)}` : '还没有导出过'}</span>
          <span>附件合计 {formatBytes(attachmentBytes)}</span>
        </div>
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>整体备份</h3>
            <p>换电脑、清缓存或换地址前，先在这里存一份。</p>
          </div>
        </header>
        <div className="export-grid">
          {OVERALL_CHOICES.map((choice) => (
            <div className="export-item" key={choice.format}>
              <span className={`export-icon ${choice.format === 'zip' ? 'green' : choice.format === 'json' ? 'blue' : 'amber'}`}>
                <Icon name={choice.icon} size={19} />
              </span>
              <div>
                <strong>{choice.title}</strong>
                <p>{choice.desc}</p>
              </div>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => void performExport({ scope: 'all', format: choice.format }, `all-${choice.format}`)}
                disabled={!!busy}
              >
                {busy === `all-${choice.format}` ? <span className="spinner small" /> : <Icon name="download" size={15} />} 导出
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>工作总结打包</h3>
            <p>{summaries.length} 天记录，按月或按年成册，可选 Markdown / 纯文本 / CSV。</p>
          </div>
          <button type="button" className="link-btn" onClick={() => navigate('/review')}>
            去写总结 <Icon name="arrowRight" size={13} />
          </button>
        </header>
        <SummaryExportPanel
          summaries={summaries}
          compact
          onExported={({ filename, days, format }) => {
            setLog(pushTransferLog({ kind: 'export', label: `工作总结（${FORMAT_META[format].label}）`, filename, records: days }))
          }}
        />
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>单项导出</h3>
            <p>只导出某一类数据，适合发给别人或单独归档。</p>
          </div>
        </header>

        <div className="transfer-datasets">
          {DATASETS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`transfer-dataset ${datasetKey === item.key ? 'active' : ''}`}
              onClick={() => selectDataset(item.key)}
            >
              <Icon name={item.icon} size={16} />
              <span>
                <strong>{item.label}</strong>
                <em>{counts[item.key]} 条</em>
              </span>
            </button>
          ))}
        </div>

        <p className="transfer-dataset-hint">{descriptor.hint}</p>

        <div className="rv-format-options transfer-formats">
          {descriptor.formats.map((format) => (
            <button
              key={format}
              type="button"
              className={`rv-format ${datasetFormat === format ? 'active' : ''}`}
              onClick={() => setDatasetFormat(format)}
            >
              <strong>{FORMAT_META[format].label}</strong>
              <em>{FORMAT_META[format].hint}</em>
              <span className="mono">.{FORMAT_META[format].ext}</span>
            </button>
          ))}
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void performExport({ scope: datasetKey, format: datasetFormat }, 'dataset')}
            disabled={!!busy || counts[datasetKey] === 0}
          >
            {busy === 'dataset' ? <span className="spinner small" /> : <Icon name="download" size={16} />}
            导出{descriptor.label}（{FORMAT_META[datasetFormat].label}）
          </button>
          <span className="muted small">
            {counts[datasetKey] === 0 ? '这一类还没有数据。' : `将写入 jing-shi-${datasetKey}-….${FORMAT_META[datasetFormat].ext}`}
          </span>
        </div>
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>导入数据</h3>
            <p>支持本应用导出的 JSON / ZIP，单项备份只会替换对应那一类数据。</p>
          </div>
        </header>

        <button type="button" className="drop-zone" onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.zip,application/json,application/zip"
            hidden
            onChange={(event) => {
              setImportFile(event.target.files?.[0] ?? null)
              setImportResult(null)
            }}
          />
          <span className="drop-icon">
            <Icon name="upload" size={22} />
          </span>
          {importFile ? (
            <span className="drop-text">
              <strong>{importFile.name}</strong>
              <em>{formatBytes(importFile.size)} · 点击可重新选择</em>
            </span>
          ) : (
            <span className="drop-text">
              <strong>选择备份文件</strong>
              <em>支持 .json 与 .zip，文件只在本地读取</em>
            </span>
          )}
        </button>

        <div className="strategy-row">
          <span className="field-label">导入策略</span>
          <div className="strategy-options">
            <label className={`strategy ${strategy === 'merge' ? 'active' : ''}`}>
              <input type="radio" name="transfer-strategy" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} />
              <span>
                <strong>合并</strong>
                <em>保留现有数据，同 ID 以更新时间较新的版本为准。</em>
              </span>
            </label>
            <label className={`strategy ${strategy === 'overwrite' ? 'active' : ''}`}>
              <input type="radio" name="transfer-strategy" checked={strategy === 'overwrite'} onChange={() => setStrategy('overwrite')} />
              <span>
                <strong>覆盖</strong>
                <em>先清空现有数据，再完整导入备份内容。</em>
              </span>
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="btn btn-primary" onClick={handleImport} disabled={busy === 'import' || !importFile}>
            {busy === 'import' ? <span className="spinner small" /> : <Icon name="upload" size={16} />}
            {busy === 'import' ? '导入中…' : '开始导入'}
          </button>
          <span className="muted small">导入不会修改或上传原始文件。</span>
        </div>

        {importResult ? (
          <div className="transfer-result">
            <Icon name="checkCircle" size={18} />
            <div>
              <strong>导入完成</strong>
              <p>
                任务 {importResult.tasks} · 笔记 {importResult.notes} · 考勤 {importResult.attendance} · 总结{' '}
                {importResult.summaries} · 附件 {importResult.attachments}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>操作记录</h3>
            <p>只记录文件名与条数，保留最近 20 条，存在本机。</p>
          </div>
          {log.length ? (
            <button type="button" className="link-btn" onClick={() => setLog(clearTransferLog())}>
              清空记录 <Icon name="trash" size={13} />
            </button>
          ) : null}
        </header>

        {log.length ? (
          <ul className="transfer-log">
            {log.slice(0, 8).map((item) => (
              <li key={item.id}>
                <span className={`transfer-log-dot ${item.kind}`} />
                <div className="transfer-log-main">
                  <strong>{item.label}</strong>
                  <em className="mono">{item.filename}</em>
                </div>
                <span className="transfer-log-meta">
                  {item.records} 条 · {relativeTime(item.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small transfer-empty">还没有导出或导入过文件。</p>
        )}
      </section>

      <p className="page-note">
        <Icon name="shield" size={14} /> 所有文件都在浏览器里生成与解析，不会上传。数据与当前地址绑定，换地址请先导出备份；
        需要清理全部数据时，前往
        <button type="button" className="inline-link" onClick={() => navigate('/settings')}>
          设置
        </button>
        页操作。
      </p>
    </div>
  )
}
