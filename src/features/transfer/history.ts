import { nowISO, uid } from '../../utils/id'

export interface TransferLogEntry {
  id: string
  kind: 'export' | 'import'
  label: string
  filename: string
  records: number
  at: string
}

const STORAGE_KEY = 'whale-work-assistant.transfer-log.v1'
const MAX_ENTRIES = 20

export function loadTransferLog(): TransferLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is TransferLogEntry =>
        !!item && typeof item.id === 'string' && typeof item.at === 'string' && typeof item.filename === 'string',
    )
  } catch {
    return []
  }
}

export function pushTransferLog(entry: Omit<TransferLogEntry, 'id' | 'at'>): TransferLogEntry[] {
  const next = [{ ...entry, id: uid(), at: nowISO() }, ...loadTransferLog()].slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 配额不足时忽略：历史记录不是关键数据 */
  }
  return next
}

export function clearTransferLog(): TransferLogEntry[] {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 忽略 */
  }
  return []
}

export function lastExportEntry(entries: TransferLogEntry[]): TransferLogEntry | null {
  return entries.find((entry) => entry.kind === 'export') ?? null
}
