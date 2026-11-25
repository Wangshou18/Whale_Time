import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AttachmentMeta,
  AttachmentRecord,
  AttendanceRecord,
  AttendanceType,
  DailySummary,
  ImportResult,
  Note,
  Period,
  Settings,
  Task,
} from '../types'
import {
  deleteNoteRecord,
  deleteSummaryRecord,
  deleteTaskRecord,
  getAttachmentRecord,
  getAttachmentsByTask,
  loadAll,
  removeAttachmentRecords,
  saveAttachmentRecords,
  saveAttendanceDay,
  saveNoteRecord,
  saveSummaryRecord,
  saveTaskRecord,
  wipeAll,
} from '../db/repository'
import { importBackupFile, type ImportStrategy } from '../features/transfer'
import { loadSettings, persistSettings } from '../utils/settings'
import { nowISO, uid } from '../utils/id'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

interface AppContextValue {
  ready: boolean
  fatal: string | null
  tasks: Task[]
  notes: Note[]
  attendance: AttendanceRecord[]
  summaries: DailySummary[]
  settings: Settings
  toasts: ToastItem[]
  notify: (message: string, tone?: ToastTone) => void
  dismissToast: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  saveTask: (draft: Task, files: File[], removedAttachmentIds: string[]) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  saveNote: (draft: Note) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  setAttendance: (date: string, period: Period, type: AttendanceType | null) => Promise<void>
  saveSummary: (date: string, content: string) => Promise<DailySummary | null>
  deleteSummary: (date: string) => Promise<void>
  getAttachmentBlob: (id: string) => Promise<Blob | undefined>
  importData: (file: File, strategy: ImportStrategy) => Promise<ImportResult>
  clearAllData: () => Promise<void>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp 必须在 AppProvider 内使用')
  return value
}

function sortAttendance(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort((a, b) => (a.date === b.date ? a.period.localeCompare(b.period) : b.date.localeCompare(a.date)))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [fatal, setFatal] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = uid()
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 3400)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const refresh = useCallback(async () => {
    const data = await loadAll()
    setTasks(data.tasks)
    setNotes(data.notes)
    setAttendanceState(data.attendance)
    setSummaries(data.summaries)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadAll()
      .then((data) => {
        if (cancelled) return
        setTasks(data.tasks)
        setNotes(data.notes)
        setAttendanceState(data.attendance)
        setSummaries(data.summaries)
        setReady(true)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFatal(error instanceof Error ? error.message : '本地数据库初始化失败')
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      persistSettings(next)
      return next
    })
  }, [])

  const saveTask = useCallback(
    async (draft: Task, files: File[], removedAttachmentIds: string[]): Promise<Task> => {
      const existing = tasks.find((task) => task.id === draft.id)
      const timestamp = nowISO()
      const id = draft.id || uid()

      const metas: AttachmentMeta[] = draft.attachments.filter((meta) => !removedAttachmentIds.includes(meta.id))
      const newRecords: AttachmentRecord[] = files.map((file) => {
        const meta: AttachmentMeta = {
          id: uid(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          createdAt: timestamp,
        }
        metas.push(meta)
        return { ...meta, taskId: id, blob: file }
      })

      if (newRecords.length) await saveAttachmentRecords(newRecords)
      if (removedAttachmentIds.length) await removeAttachmentRecords(removedAttachmentIds)

      const task: Task = {
        ...draft,
        id,
        title: draft.title.trim(),
        attachments: metas,
        createdAt: existing?.createdAt ?? draft.createdAt ?? timestamp,
        updatedAt: timestamp,
        completedAt: draft.status === 'done' ? draft.completedAt ?? timestamp : null,
      }

      await saveTaskRecord(task)
      setTasks((prev) => {
        const hasItem = prev.some((item) => item.id === task.id)
        return hasItem ? prev.map((item) => (item.id === task.id ? task : item)) : [task, ...prev]
      })
      return task
    },
    [tasks],
  )

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const task = tasks.find((item) => item.id === id)
      const linked = await getAttachmentsByTask(id)
      const ids = new Set<string>(linked.map((record) => record.id))
      task?.attachments.forEach((meta) => ids.add(meta.id))
      if (ids.size) await removeAttachmentRecords(Array.from(ids))
      await deleteTaskRecord(id)
      setTasks((prev) => prev.filter((item) => item.id !== id))
    },
    [tasks],
  )

  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const task = tasks.find((item) => item.id === id)
      if (!task) return
      const timestamp = nowISO()
      const done = task.status !== 'done'
      const next: Task = {
        ...task,
        status: done ? 'done' : 'todo',
        completedAt: done ? timestamp : null,
        updatedAt: timestamp,
      }
      await saveTaskRecord(next)
      setTasks((prev) => prev.map((item) => (item.id === id ? next : item)))
    },
    [tasks],
  )

  const saveNote = useCallback(
    async (draft: Note): Promise<Note> => {
      const existing = notes.find((note) => note.id === draft.id)
      const timestamp = nowISO()
      const note: Note = {
        ...draft,
        id: draft.id || uid(),
        title: draft.title.trim(),
        createdAt: existing?.createdAt ?? draft.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      await saveNoteRecord(note)
      setNotes((prev) => {
        const hasItem = prev.some((item) => item.id === note.id)
        return hasItem ? prev.map((item) => (item.id === note.id ? note : item)) : [note, ...prev]
      })
      return note
    },
    [notes],
  )

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await deleteNoteRecord(id)
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }, [])

  const setAttendance = useCallback(
    async (date: string, period: Period, type: AttendanceType | null): Promise<void> => {
      const current = attendance.filter((record) => record.date === date)
      const timestamp = nowISO()
      const full = current.find((record) => record.period === 'full')
      let am = current.find((record) => record.period === 'am')
      let pm = current.find((record) => record.period === 'pm')

      let desired: AttendanceRecord[]
      if (period === 'full') {
        desired =
          type === null
            ? []
            : [{ id: `${date}-full`, date, period: 'full', type, createdAt: timestamp }]
      } else {
        if (full) {
          am = am ?? { id: `${date}-am`, date, period: 'am', type: full.type, createdAt: full.createdAt }
          pm = pm ?? { id: `${date}-pm`, date, period: 'pm', type: full.type, createdAt: full.createdAt }
        }
        if (type === null) {
          if (period === 'am') am = undefined
          else pm = undefined
        } else if (period === 'am') {
          am = { id: `${date}-am`, date, period: 'am', type, createdAt: timestamp }
        } else {
          pm = { id: `${date}-pm`, date, period: 'pm', type, createdAt: timestamp }
        }
        desired = [am, pm].filter((record): record is AttendanceRecord => !!record)
      }

      await saveAttendanceDay(date, desired)
      setAttendanceState((prev) => sortAttendance([...prev.filter((record) => record.date !== date), ...desired]))
    },
    [attendance],
  )

  const getAttachmentBlob = useCallback(async (id: string): Promise<Blob | undefined> => {
    const record = await getAttachmentRecord(id)
    return record?.blob
  }, [])

  const saveSummary = useCallback(
    async (date: string, content: string): Promise<DailySummary | null> => {
      const existing = summaries.find((item) => item.id === date)
      if (!content.trim()) {
        if (existing) {
          await deleteSummaryRecord(date)
          setSummaries((prev) => prev.filter((item) => item.id !== date))
        }
        return null
      }
      const timestamp = nowISO()
      const summary: DailySummary = {
        id: date,
        date,
        content,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      await saveSummaryRecord(summary)
      setSummaries((prev) => {
        const hasItem = prev.some((item) => item.id === date)
        const next = hasItem ? prev.map((item) => (item.id === date ? summary : item)) : [summary, ...prev]
        return next.sort((a, b) => b.date.localeCompare(a.date))
      })
      return summary
    },
    [summaries],
  )

  const deleteSummary = useCallback(async (date: string): Promise<void> => {
    await deleteSummaryRecord(date)
    setSummaries((prev) => prev.filter((item) => item.id !== date))
  }, [])

  const importData = useCallback(
    async (file: File, strategy: ImportStrategy): Promise<ImportResult> => {
      const result = await importBackupFile(file, strategy)
      await refresh()
      if (result.settings) {
        setSettings(result.settings)
        persistSettings(result.settings)
      }
      return result
    },
    [refresh],
  )

  const clearAllData = useCallback(async (): Promise<void> => {
    await wipeAll()
    setTasks([])
    setNotes([])
    setAttendanceState([])
    setSummaries([])
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      fatal,
      tasks,
      notes,
      attendance,
      summaries,
      settings,
      toasts,
      notify,
      dismissToast,
      updateSettings,
      saveTask,
      deleteTask,
      toggleTask,
      saveNote,
      deleteNote,
      setAttendance,
      saveSummary,
      deleteSummary,
      getAttachmentBlob,
      importData,
      clearAllData,
      refresh,
    }),
    [
      ready,
      fatal,
      tasks,
      notes,
      attendance,
      summaries,
      settings,
      toasts,
      notify,
      dismissToast,
      updateSettings,
      saveTask,
      deleteTask,
      toggleTask,
      saveNote,
      deleteNote,
      setAttendance,
      saveSummary,
      deleteSummary,
      getAttachmentBlob,
      importData,
      clearAllData,
      refresh,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
