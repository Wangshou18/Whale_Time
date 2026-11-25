import type { AttendanceRecord, Note, Task } from '../types'
import { PRIORITY_META } from '../types'
import { diffDays } from './date'

export interface DayAttendance {
  full?: AttendanceRecord
  am?: AttendanceRecord
  pm?: AttendanceRecord
  effectiveAm?: 'work' | 'rest'
  effectivePm?: 'work' | 'rest'
  hasRecord: boolean
  work: boolean
  rest: boolean
  summary: string
}

export function dayAttendance(records: AttendanceRecord[]): DayAttendance {
  const full = records.find((record) => record.period === 'full')
  const am = records.find((record) => record.period === 'am')
  const pm = records.find((record) => record.period === 'pm')
  const effectiveAm = full?.type ?? am?.type
  const effectivePm = full?.type ?? pm?.type

  let summary = '未打卡'
  if (full) {
    summary = full.type === 'work' ? '全天已打卡' : '全天休息'
  } else if (effectiveAm && effectivePm) {
    summary =
      effectiveAm === effectivePm
        ? effectiveAm === 'work'
          ? '全天已打卡'
          : '全天休息'
        : `上午${effectiveAm === 'work' ? '打卡' : '休息'} · 下午${effectivePm === 'work' ? '打卡' : '休息'}`
  } else if (effectiveAm) {
    summary = `上午${effectiveAm === 'work' ? '已打卡' : '休息'}`
  } else if (effectivePm) {
    summary = `下午${effectivePm === 'work' ? '已打卡' : '休息'}`
  }

  return {
    full,
    am,
    pm,
    effectiveAm,
    effectivePm,
    hasRecord: !!full || !!am || !!pm,
    work: full?.type === 'work' || am?.type === 'work' || pm?.type === 'work',
    rest: full?.type === 'rest' || am?.type === 'rest' || pm?.type === 'rest',
    summary,
  }
}

export interface AttendanceStats {
  totalDays: number
  recordedDays: number
  workDays: number
  restDays: number
  unrecordedDays: number
  rate: number
}

export function attendanceStats(records: AttendanceRecord[], from: string, to: string): AttendanceStats {
  const totalDays = Math.max(0, diffDays(from, to) + 1)
  const inRange = records.filter((record) => record.date >= from && record.date <= to)
  const workDates = new Set(inRange.filter((record) => record.type === 'work').map((record) => record.date))
  const restDates = new Set(inRange.filter((record) => record.type === 'rest').map((record) => record.date))
  const recordedDates = new Set(inRange.map((record) => record.date))
  return {
    totalDays,
    recordedDays: recordedDates.size,
    workDays: workDates.size,
    restDays: restDates.size,
    unrecordedDays: Math.max(0, totalDays - recordedDates.size),
    rate: totalDays ? workDates.size / totalDays : 0,
  }
}

export interface AgendaItem {
  key: string
  kind: 'task' | 'note'
  title: string
  label: string
  done: boolean
  priority?: keyof typeof PRIORITY_META
  task?: Task
  note?: Note
}

export function buildAgenda(tasks: Task[], notes: Note[], date: string): AgendaItem[] {
  const seen = new Set<string>()
  const items: AgendaItem[] = []

  tasks.forEach((task) => {
    if (task.startDate !== date && task.dueDate !== date) return
    if (seen.has(task.id)) return
    seen.add(task.id)
    const starting = task.startDate === date
    const due = task.dueDate === date
    items.push({
      key: `task-${task.id}`,
      kind: 'task',
      title: task.title,
      label: starting && due ? '开始并截止' : due ? '今日截止' : '今日开始',
      done: task.status === 'done',
      priority: task.priority,
      task,
    })
  })

  notes
    .filter((note) => note.date === date)
    .forEach((note) => {
      items.push({
        key: `note-${note.id}`,
        kind: 'note',
        title: note.title,
        label: '关联笔记',
        done: false,
        note,
      })
    })

  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'task' ? -1 : 1
    if (a.priority && b.priority) return PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight
    return 0
  })
}
