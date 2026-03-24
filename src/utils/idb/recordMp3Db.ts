type RecordMp3Row = {
  recordId: string
  blob: Blob
  updatedAt: number
}

const DB_NAME = 'timer_record_mp3_v1'
const STORE_NAME = 'recordMp3'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'recordId' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putRecordMp3(recordId: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE_NAME).put({ recordId, blob, updatedAt: Date.now() } satisfies RecordMp3Row)
  })
  db.close()
}

export async function getRecordMp3Blob(recordId: string): Promise<Blob | null> {
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(recordId)
    req.onsuccess = () => resolve((req.result as RecordMp3Row | undefined)?.blob ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

export async function hasRecordMp3(recordId: string): Promise<boolean> {
  const blob = await getRecordMp3Blob(recordId)
  return blob != null
}

