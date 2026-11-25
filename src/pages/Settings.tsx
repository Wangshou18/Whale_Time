import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttachmentRecord, ThemeMode } from '../types'
import { useApp } from '../store/AppStore'
import { useUI } from '../context/uiContext'
import { Icon } from '../components/Icons'
import { getAllAttachments } from '../db/repository'
import { exportBackup, exportCsvBundle, type ImportStrategy } from '../utils/backup'
import { downloadBlob, formatBytes } from '../utils/format'

const THEME_OPTIONS: { value: ThemeMode; label: string; desc: string; icon: 'sun' | 'moon' | 'monitor' }[] = [
  { value: 'light', label: '浅色', desc: '清爽明亮', icon: 'sun' },
  { value: 'dark', label: '深色', desc: '夜间友好', icon: 'moon' },
  { value: 'system', label: '跟随系统', desc: '自动切换', icon: 'monitor' },
]

export function SettingsPage() {
  const { tasks, notes, attendance, summaries, settings, updateSettings, importData, clearAllData, notify } = useApp()
  const { confirm, openShortcuts } = useUI()
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>('merge')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadStorage = useCallback(async () => {
    try {
      setAttachments(await getAllAttachments())
    } catch {
      setAttachments([])
    }
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        setUsage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 })
      } catch {
        setUsage(null)
      }
    }
  }, [])

  useEffect(() => {
    void loadStorage()
  }, [loadStorage])

  const attachmentBytes = attachments.reduce((sum, record) => sum + (record.size || 0), 0)
  const usagePercent = usage && usage.quota ? Math.min(100, (usage.usage / usage.quota) * 100) : 0
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : 'file://'

  const runExport = async (kind: 'json' | 'zip' | 'csv') => {
    setBusy(kind)
    try {
      const result = kind === 'csv' ? await exportCsvBundle() : await exportBackup(kind === 'zip')
      downloadBlob(result.blob, result.filename)
      notify(
        kind === 'zip' ? '完整备份已导出（含附件）' : kind === 'csv' ? 'CSV 表格包已导出' : '备份 JSON 已导出',
      )
    } catch (error) {
      notify(error instanceof Error ? error.message : '导出失败，请重试', 'error')
    } finally {
      setBusy(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      notify('请先选择备份文件', 'error')
      return
    }
    if (strategy === 'overwrite') {
      const ok = await confirm({
        title: '覆盖现有数据？',
        message: '导入前会清空当前全部任务、笔记、考勤、总结和附件。此操作不可撤销，建议先导出一份备份。',
        confirmText: '继续覆盖',
        danger: true,
      })
      if (!ok) return
    }
    setBusy('import')
    try {
      const result = await importData(importFile, strategy)
      notify(
        `导入完成：${result.tasks} 个任务、${result.notes} 篇笔记、${result.attendance} 条考勤、${result.summaries} 天总结、${result.attachments} 个附件`,
      )
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await loadStorage()
    } catch (error) {
      notify(error instanceof Error ? error.message : '导入失败，请检查文件格式', 'error')
    } finally {
      setBusy(null)
    }
  }

  const handleClear = async () => {
    const ok = await confirm({
      title: '清除全部本地数据？',
      message: '任务、笔记、考勤、总结和所有附件都会被永久删除，且无法恢复。建议先导出一份完整备份。',
      confirmText: '确认清除',
      danger: true,
    })
    if (!ok) return
    setBusy('clear')
    try {
      await clearAllData()
      await loadStorage()
      notify('本地数据已全部清除', 'info')
    } catch {
      notify('清除数据失败，请重试', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="settings-page">
      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>外观</h3>
            <p>主题会立即生效，并保存在本机配置中。</p>
          </div>
        </header>
        <div className="theme-grid">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`theme-tile ${settings.theme === option.value ? 'active' : ''}`}
              onClick={() => updateSettings({ theme: option.value })}
            >
              <span className={`theme-preview ${option.value}`}>
                <span className="tp-side" />
                <span className="tp-main">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className="theme-info">
                <strong>
                  <Icon name={option.icon} size={15} /> {option.label}
                </strong>
                <em>{option.desc}</em>
              </span>
              <span className={`radio-dot ${settings.theme === option.value ? 'active' : ''}`} />
            </button>
          ))}
        </div>
      </section>

      <div className="settings-grid">
        <section className="card settings-card">
          <header className="section-head">
            <div>
              <h3>提醒</h3>
              <p>控制仪表盘「即将到期」的判定范围。</p>
            </div>
          </header>
          <div className="setting-row">
            <div>
              <strong>提前提醒天数</strong>
              <p className="muted small">截止日期进入该范围后，会出现在提醒栏中。</p>
            </div>
            <select
              className="input select-sm"
              value={settings.reminderDays}
              onChange={(event) => updateSettings({ reminderDays: Number(event.target.value) })}
            >
              {[0, 1, 2, 3, 5, 7, 14].map((days) => (
                <option key={days} value={days}>
                  {days === 0 ? '仅到期当天' : `提前 ${days} 天`}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>键盘快捷键</strong>
              <p className="muted small">Alt + N 新建任务，Alt + M 新建笔记。</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={openShortcuts}>
              <Icon name="keyboard" size={15} /> 查看全部
            </button>
          </div>
        </section>

        <section className="card settings-card">
          <header className="section-head">
            <div>
              <h3>本地存储</h3>
              <p>所有内容存放在浏览器 IndexedDB，不会上传。</p>
            </div>
            <button type="button" className="link-btn" onClick={() => void loadStorage()}>
              刷新 <Icon name="restore" size={13} />
            </button>
          </header>
          <div className="storage-bar">
            <span style={{ width: `${Math.max(2, usagePercent)}%` }} />
          </div>
          <div className="storage-meta">
            <span>已用 {usage ? formatBytes(usage.usage) : formatBytes(attachmentBytes)}</span>
            <span>{usage?.quota ? `可用配额 ${formatBytes(usage.quota)}` : '浏览器未提供配额信息'}</span>
          </div>
          <div className="storage-grid">
            <span><strong>{tasks.length}</strong> 任务</span>
            <span><strong>{notes.length}</strong> 笔记</span>
            <span><strong>{attendance.length}</strong> 考勤</span>
            <span><strong>{summaries.length}</strong> 总结</span>
            <span><strong>{attachments.length}</strong> 附件</span>
          </div>
          <div className="storage-origin">
            <span>当前访问地址</span>
            <code>{currentOrigin}</code>
          </div>
          <p className="muted small">
            数据与这个地址绑定：换端口、<code>localhost</code> 与 <code>127.0.0.1</code> 互换、或改用 <code>file://</code> 打开，都会看到另一份空数据。
            若在别的地址存过内容，可先打开
            <a className="inline-link" href="./data-check.html" target="_blank" rel="noreferrer">数据体检</a>
            导出备份，再回到固定地址导入。
          </p>
          <p className="muted small">附件合计 {formatBytes(attachmentBytes)}。浏览器清除站点数据会同时删除本应用的全部内容，请定期导出备份。</p>
        </section>
      </div>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>导出数据</h3>
            <p>在前端本地生成文件，不经过任何网络请求。</p>
          </div>
        </header>
        <div className="export-grid">
          <div className="export-item">
            <span className="export-icon blue"><Icon name="database" size={19} /></span>
            <div>
              <strong>备份 JSON</strong>
              <p>任务、笔记、考勤、每日总结与设置，轻量快捷。不含附件文件。</p>
            </div>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => void runExport('json')} disabled={!!busy}>
              {busy === 'json' ? <span className="spinner small" /> : <Icon name="download" size={15} />} 导出
            </button>
          </div>
          <div className="export-item">
            <span className="export-icon green"><Icon name="hardDrive" size={19} /></span>
            <div>
              <strong>完整备份 ZIP</strong>
              <p>包含 JSON 与全部附件原始文件，可用于完整恢复。</p>
            </div>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => void runExport('zip')} disabled={!!busy}>
              {busy === 'zip' ? <span className="spinner small" /> : <Icon name="download" size={15} />} 导出
            </button>
          </div>
          <div className="export-item">
            <span className="export-icon amber"><Icon name="text" size={19} /></span>
            <div>
              <strong>CSV 表格包</strong>
              <p>任务、笔记、考勤、总结四个 CSV，方便在表格软件中查看。</p>
            </div>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => void runExport('csv')} disabled={!!busy}>
              {busy === 'csv' ? <span className="spinner small" /> : <Icon name="download" size={15} />} 导出
            </button>
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <header className="section-head">
          <div>
            <h3>导入数据</h3>
            <p>支持本应用导出的 JSON 或 ZIP，ZIP 可以恢复附件。</p>
          </div>
        </header>

        <button type="button" className="drop-zone" onClick={() => fileRef.current?.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.zip,application/json,application/zip"
            hidden
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
          />
          <span className="drop-icon"><Icon name="upload" size={22} /></span>
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
              <input type="radio" name="strategy" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} />
              <span>
                <strong>合并</strong>
                <em>保留现有数据，同 ID 以更新时间较新的版本为准。</em>
              </span>
            </label>
            <label className={`strategy ${strategy === 'overwrite' ? 'active' : ''}`}>
              <input type="radio" name="strategy" checked={strategy === 'overwrite'} onChange={() => setStrategy('overwrite')} />
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
      </section>

      <div className="settings-grid">
        <section className="card settings-card">
          <header className="section-head">
            <div>
              <h3>关于鲸时</h3>
              <p>一个不联网也能好好工作的个人助手。</p>
            </div>
            <span className="version-chip">v1.1.0</span>
          </header>
          <ul className="about-list">
            <li><Icon name="shield" size={15} /> 无账户、无登录、无云同步</li>
            <li><Icon name="database" size={15} /> 数据保存在浏览器 IndexedDB</li>
            <li><Icon name="hardDrive" size={15} /> 附件以 Blob 形式本地存储</li>
            <li><Icon name="sparkles" size={15} /> 支持 PWA 离线安装（HTTPS 或 localhost）</li>
          </ul>
          <p className="muted small">想装到桌面：在浏览器菜单中选择「安装应用 / 添加到主屏幕」，离线也能打开。</p>
        </section>

        <section className="card settings-card danger-zone">
          <header className="section-head">
            <div>
              <h3>危险操作</h3>
              <p>清除后无法恢复，请先导出完整备份。</p>
            </div>
          </header>
          <div className="danger-row">
            <div>
              <strong>清除全部本地数据</strong>
              <p className="muted small">删除全部任务、笔记、考勤、总结记录与附件。</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={handleClear} disabled={busy === 'clear'}>
              <Icon name="trash" size={15} /> 清除数据
            </button>
          </div>
        </section>
      </div>

      <p className="page-note">
        <Icon name="shield" size={14} /> 隐私说明：本应用不发起任何数据上传请求，不包含统计脚本；唯一的外部资源是构建时打包进本地的代码与样式。
      </p>
    </div>
  )
}
