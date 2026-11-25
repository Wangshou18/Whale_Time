const DB_NAME = 'whale-work-assistant'
const DB_VERSION = 2

export type StoreName = 'tasks' | 'notes' | 'attendance' | 'attachments' | 'summaries'

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('attendance')) {
        const store = db.createObjectStore('attendance', { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains('attachments')) {
        const store = db.createObjectStore('attachments', { keyPath: 'id' })
        store.createIndex('taskId', 'taskId', { unique: false })
      }
      // v2：每日工作总结，id 即日期
      if (!db.objectStoreNames.contains('summaries')) db.createObjectStore('summaries', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'))
    request.onblocked = () => reject(new Error('数据库被其他标签页占用，请关闭后重试'))
  })
  return dbPromise
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('本地数据操作失败'))
  })
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return wrapRequest<T[]>(db.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>)
}

export async function getByIndex<T>(store: StoreName, index: string, key: IDBValidKey): Promise<T[]> {
  const db = await openDB()
  return wrapRequest<T[]>(
    db.transaction(store, 'readonly').objectStore(store).index(index).getAll(key) as IDBRequest<T[]>,
  )
}

export async function getOne<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB()
  return wrapRequest<T | undefined>(db.transaction(store, 'readonly').objectStore(store).get(key) as IDBRequest<T | undefined>)
}

function runWrite(store: StoreName, action: (objectStore: IDBObjectStore) => void): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        action(tx.objectStore(store))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('写入本地数据失败'))
        tx.onabort = () => reject(tx.error ?? new Error('写入本地数据被中止'))
      }),
  )
}

export function put<T>(store: StoreName, value: T): Promise<void> {
  return runWrite(store, (objectStore) => objectStore.put(value))
}

export function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return Promise.resolve()
  return runWrite(store, (objectStore) => {
    values.forEach((value) => objectStore.put(value))
  })
}

export function remove(store: StoreName, key: IDBValidKey): Promise<void> {
  return runWrite(store, (objectStore) => objectStore.delete(key))
}

export function removeMany(store: StoreName, keys: IDBValidKey[]): Promise<void> {
  if (!keys.length) return Promise.resolve()
  return runWrite(store, (objectStore) => {
    keys.forEach((key) => objectStore.delete(key))
  })
}

export async function replaceAttendanceDay(date: string, records: { id: string; date: string; period: string; type: string; createdAt: string }[]): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('attendance', 'readwrite')
    const store = tx.objectStore('attendance')
    const index = store.index('date')
    const request = index.openKeyCursor(IDBKeyRange.only(date))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      } else {
        records.forEach((record) => store.put(record))
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('更新考勤失败'))
    tx.onabort = () => reject(tx.error ?? new Error('更新考勤被中止'))
  })
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('清空数据失败'))
  })
}

export async function clearEverything(): Promise<void> {
  const stores: StoreName[] = ['tasks', 'notes', 'attendance', 'attachments', 'summaries']
  for (const store of stores) await clearStore(store)
}

export interface BulkData {
  tasks: unknown[]
  notes: unknown[]
  attendance: unknown[]
  summaries: unknown[]
  attachments: unknown[]
}

export async function bulkReplace(data: BulkData): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const names: StoreName[] = ['tasks', 'notes', 'attendance', 'summaries', 'attachments']
    const tx = db.transaction(names, 'readwrite')
    names.forEach((name) => tx.objectStore(name).clear())
    data.tasks.forEach((item) => tx.objectStore('tasks').put(item))
    data.notes.forEach((item) => tx.objectStore('notes').put(item))
    data.attendance.forEach((item) => tx.objectStore('attendance').put(item))
    data.summaries.forEach((item) => tx.objectStore('summaries').put(item))
    data.attachments.forEach((item) => tx.objectStore('attachments').put(item))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('导入数据失败'))
    tx.onabort = () => reject(tx.error ?? new Error('导入数据被中止'))
  })
}
