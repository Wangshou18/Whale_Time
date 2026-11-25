import type { AttachmentRecord, AttendanceRecord, DailySummary, Note, Task } from '../types'
import { getAll, getByIndex, getOne, put, putMany, remove, removeMany, replaceAttendanceDay, clearEverything } from './db'

export async function loadAll() {
  const [tasks, notes, attendance, summaries] = await Promise.all([
    getAll<Task>('tasks'),
    getAll<Note>('notes'),
    getAll<AttendanceRecord>('attendance'),
    getAll<DailySummary>('summaries'),
  ])
  return {
    tasks: tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notes: notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    attendance: attendance.sort((a, b) => (a.date === b.date ? a.period.localeCompare(b.period) : b.date.localeCompare(a.date))),
    summaries: summaries.sort((a, b) => b.date.localeCompare(a.date)),
  }
}

export function saveTaskRecord(task: Task): Promise<void> {
  return put('tasks', task)
}

export function deleteTaskRecord(id: string): Promise<void> {
  return remove('tasks', id)
}

export function saveNoteRecord(note: Note): Promise<void> {
  return put('notes', note)
}

export function deleteNoteRecord(id: string): Promise<void> {
  return remove('notes', id)
}

export function saveAttendanceDay(date: string, records: AttendanceRecord[]): Promise<void> {
  return replaceAttendanceDay(date, records)
}

export function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  return put('attendance', record)
}

export function saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  return putMany('attendance', records)
}

export function deleteAttendanceRecord(id: string): Promise<void> {
  return remove('attendance', id)
}

export function saveAttachmentRecord(record: AttachmentRecord): Promise<void> {
  return put('attachments', record)
}

export function saveSummaryRecord(summary: DailySummary): Promise<void> {
  return put('summaries', summary)
}

export function deleteSummaryRecord(id: string): Promise<void> {
  return remove('summaries', id)
}

export function saveAttachmentRecords(records: AttachmentRecord[]): Promise<void> {
  return putMany('attachments', records)
}

export async function getAttachmentRecord(id: string): Promise<AttachmentRecord | undefined> {
  return getOne<AttachmentRecord>('attachments', id)
}

export async function getAttachmentsByTask(taskId: string): Promise<AttachmentRecord[]> {
  return getByIndex<AttachmentRecord>('attachments', 'taskId', taskId)
}

export function removeAttachmentRecords(ids: string[]): Promise<void> {
  return removeMany('attachments', ids)
}

export function removeNoteRecords(ids: string[]): Promise<void> {
  return removeMany('notes', ids)
}

export async function getAllAttachments(): Promise<AttachmentRecord[]> {
  return getAll<AttachmentRecord>('attachments')
}

export async function wipeAll(): Promise<void> {
  await clearEverything()
}
