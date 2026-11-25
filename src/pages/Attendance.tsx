import { useMemo, useState } from 'react'
import type { AttendanceRecord, AttendanceType, Period } from '../types'
import { useApp } from '../store/AppStore'
import { Icon } from '../components/Icons'
import {
  addDaysISO,
  diffDays,
  formatShort,
  fromISO,
  monthLabel,
  toISO,
  todayISO,
  weekdayShort,
} from '../utils/date'
import { attendanceStats, dayAttendance } from '../utils/attendance'
import { downloadBlob } from '../utils/format'

interface PeriodControlProps {
  work: boolean
  rest: boolean
  full?: boolean
  onSet: (type: AttendanceType | null) => void
}

function PeriodControl({ work, rest, full = false, onSet }: PeriodControlProps) {
  return (
    <div className="att-ctrl">
      <button
        type="button"
        className={`att-btn ${work ? 'active work' : ''}`}
        onClick={() => onSet(work ? null : 'work')}
        title={work ? '取消打卡' : '标记打卡'}
      >
        <Icon name="check" size={13} />
        <span>{full ? '全天' : '打卡'}</span>
      </button>
      <button
        type="button"
        className={`att-btn ${rest ? 'active rest' : ''}`}
        onClick={() => onSet(rest ? null : 'rest')}
        title={rest ? '取消休息' : '标记休息'}
      >
        <Icon name="rest" size={13} />
        <span>休息</span>
      </button>
    </div>
  )
}

export function AttendancePage() {
  const { attendance, setAttendance, notify } = useApp()
  const today = todayISO()

  const [range, setRange] = useState(() => {
    const now = new Date()
    return {
      from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
  })

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>()
    attendance.forEach((record) => {
      const list = map.get(record.date)
      if (list) list.push(record)
      else map.set(record.date, [record])
    })
    return map
  }, [attendance])

  const statsEnd = range.to > today ? today : range.to
  const stats =
    range.from && range.to && range.from <= statsEnd
      ? attendanceStats(attendance, range.from, statsEnd)
      : { totalDays: 0, recordedDays: 0, workDays: 0, restDays: 0, unrecordedDays: 0, rate: 0 }
  const statsLabel = range.to > today ? '截至今日' : '按自然日'

  const days = useMemo(() => {
    if (!range.from || !range.to || range.from > range.to) return []
    const total = diffDays(range.from, range.to) + 1
    const safeTotal = Math.min(total, 400)
    return Array.from({ length: safeTotal }, (_, index) => addDaysISO(range.from, index))
  }, [range])

  const fromDate = range.from ? fromISO(range.from) : null
  const isFullMonth =
    !!fromDate &&
    fromDate.getDate() === 1 &&
    range.to === toISO(new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0))
  const rangeLabel = !range.from || !range.to
    ? '请选择日期范围'
    : isFullMonth && fromDate
      ? monthLabel(fromDate.getFullYear(), fromDate.getMonth())
      : `${formatShort(range.from)} – ${formatShort(range.to)}`

  const shiftMonth = (direction: number) => {
    const base = range.from ? fromISO(range.from) : new Date()
    const first = new Date(base.getFullYear(), base.getMonth() + direction, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    setRange({ from: toISO(first), to: toISO(last) })
  }

  const goCurrentMonth = () => {
    const now = new Date()
    setRange({ from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)) })
  }

  const todayAtt = dayAttendance(recordsByDate.get(today) ?? [])

  const markToday = async (type: AttendanceType) => {
    const active = todayAtt.full?.type === type
    await setAttendance(today, 'full', active ? null : type)
    notify(active ? '已清除今日考勤' : type === 'work' ? '今日已打卡' : '今日已记录休息', 'info')
  }

  const setPeriod = async (date: string, period: Period, type: AttendanceType | null) => {
    try {
      await setAttendance(date, period, type)
    } catch {
      notify('更新考勤失败，请重试', 'error')
    }
  }

  const exportCsv = () => {
    const records = attendance
      .filter((record) => record.date >= range.from && record.date <= range.to)
      .sort((a, b) => (a.date === b.date ? a.period.localeCompare(b.period) : a.date.localeCompare(b.date)))
    if (!records.length) {
      notify('所选范围内没有考勤记录', 'info')
      return
    }
    const rows = [['日期', '时段', '状态', '记录时间']]
    records.forEach((record) => {
      rows.push([
        record.date,
        record.period === 'am' ? '上午' : record.period === 'pm' ? '下午' : '全天',
        record.type === 'work' ? '已打卡' : '休息',
        record.createdAt,
      ])
    })
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')}`
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `考勤记录-${range.from}-${range.to}.csv`)
    notify('考勤 CSV 已导出')
  }

  return (
    <div className="attendance-page">
      <div className="page-bar">
        <div className="range-nav">
          <button type="button" className="icon-btn bordered" onClick={() => shiftMonth(-1)} aria-label="上个月">
            <Icon name="chevronLeft" size={17} />
          </button>
          <h2 className="range-label">{rangeLabel}</h2>
          <button type="button" className="icon-btn bordered" onClick={() => shiftMonth(1)} aria-label="下个月">
            <Icon name="chevronRight" size={17} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goCurrentMonth}>
            本月
          </button>
        </div>
        <div className="att-actions">
          <button
            type="button"
            className={`btn btn-sm ${todayAtt.full?.type === 'work' ? 'btn-soft active' : 'btn-soft'}`}
            onClick={() => markToday('work')}
          >
            <Icon name="check" size={15} /> 今天打卡
          </button>
          <button
            type="button"
            className={`btn btn-sm ${todayAtt.full?.type === 'rest' ? 'btn-soft active' : 'btn-ghost'}`}
            onClick={() => markToday('rest')}
          >
            <Icon name="rest" size={15} /> 今天休息
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            <Icon name="download" size={15} /> 导出 CSV
          </button>
        </div>
      </div>

      <section className="stat-grid compact-stats att-stats">
        <article className="mini-stat">
          <span>出勤天数</span>
          <strong>{stats.workDays}</strong>
          <em>{stats.totalDays} 天中</em>
        </article>
        <article className="mini-stat">
          <span>休息天数</span>
          <strong>{stats.restDays}</strong>
          <em>含半天</em>
        </article>
        <article className="mini-stat">
          <span>未记录</span>
          <strong>{stats.unrecordedDays}</strong>
          <em>{statsLabel}</em>
        </article>
        <article className="mini-stat">
          <span>出勤率</span>
          <strong>{Math.round(stats.rate * 100)}%</strong>
          <em>{statsLabel}</em>
        </article>
      </section>

      <section className="card att-card">
        <header className="section-head att-card-head">
          <div>
            <h3>考勤明细</h3>
            <p>上午、下午可分别记录，也可以一键标记全天</p>
          </div>
          <div className="date-range">
            <span>从</span>
            <input
              type="date"
              className="input select-sm"
              value={range.from}
              onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
            />
            <span>至</span>
            <input
              type="date"
              className="input select-sm"
              value={range.to}
              onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </header>

        {days.length ? (
          <div className="table-scroll">
            <table className="data-table att-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>上午</th>
                  <th>下午</th>
                  <th>全天</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const records = recordsByDate.get(day) ?? []
                  const att = dayAttendance(records)
                  const d = fromISO(day)
                  const weekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <tr key={day} className={`${day === today ? 'today-row' : ''} ${weekend ? 'weekend' : ''}`}>
                      <td>
                        <div className="att-date">
                          <strong>{formatShort(day)}</strong>
                          <span>周{weekdayShort(day)}</span>
                          {day === today ? <em className="today-tag">今天</em> : null}
                        </div>
                      </td>
                      <td>
                        <PeriodControl
                          work={att.effectiveAm === 'work'}
                          rest={att.effectiveAm === 'rest'}
                          onSet={(type) => setPeriod(day, 'am', type)}
                        />
                      </td>
                      <td>
                        <PeriodControl
                          work={att.effectivePm === 'work'}
                          rest={att.effectivePm === 'rest'}
                          onSet={(type) => setPeriod(day, 'pm', type)}
                        />
                      </td>
                      <td>
                        <PeriodControl
                          full
                          work={att.full?.type === 'work'}
                          rest={att.full?.type === 'rest'}
                          onSet={(type) => setPeriod(day, 'full', type)}
                        />
                      </td>
                      <td>
                        <span className={`status-chip ${att.work ? 'done' : att.rest ? 'rest' : 'todo'}`}>{att.summary}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="calendar" size={24} /></div>
            <h4>日期范围无效</h4>
            <p>请确认起始日期不晚于结束日期。</p>
          </div>
        )}
      </section>

      <p className="page-note">
        <Icon name="shield" size={14} /> 考勤数据保存在本机 IndexedDB，支持随时导出 CSV 备份。统计按自然日计算，同日既有打卡又有休息记录时会同时计入两侧。
      </p>
    </div>
  )
}
