import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { renderRecordMp3FromNoteIds } from '@/composables/renderRecordMp3'
import { getRecordMp3Blob, hasRecordMp3, putRecordMp3 } from '@/utils/idb/recordMp3Db'

export type MusicRecord = {
  id: string
  name: string
  createdAt: number
  noteIds: string[]
}

type MusicPersistState = {
  records: MusicRecord[]
  pinnedRecordId: string | null
  mp3ReadyAtByRecordId: Record<string, number>
}

const STORAGE_KEY = 'timer_music_v1'

function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `rec_${Date.now()}_${Math.floor(Math.random() * 10_000)}`
  }
}

function loadMusic(): MusicPersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { records: [], pinnedRecordId: null, mp3ReadyAtByRecordId: {} }
    const parsed = JSON.parse(raw) as MusicPersistState
    return parsed ?? { records: [], pinnedRecordId: null, mp3ReadyAtByRecordId: {} }
  } catch {
    return { records: [], pinnedRecordId: null, mp3ReadyAtByRecordId: {} }
  }
}

function persistMusic(records: MusicRecord[], pinnedRecordId: string | null, mp3ReadyAtByRecordId: Record<string, number>) {
  try {
    const payload: MusicPersistState = { records, pinnedRecordId, mp3ReadyAtByRecordId }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

function encodeShare(payload: unknown): string {
  const json = JSON.stringify(payload)
  return btoa(unescape(encodeURIComponent(json)))
}

function decodeShare<T>(code: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(code)))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export const useMusicStore = defineStore('music', () => {
  const { records, pinnedRecordId, mp3ReadyAtByRecordId } = loadMusic()
  const musicRecords = ref<MusicRecord[]>(records)
  const pinnedId = ref<string | null>(pinnedRecordId)
  const mp3ReadyAt = ref<Record<string, number>>(mp3ReadyAtByRecordId ?? {})

  // ObjectURL 快取（只保存在記憶體，不進 localStorage）
  const mp3UrlCache = new Map<string, string>()

  const pinnedRecord = computed(() => musicRecords.value.find((r) => r.id === pinnedId.value) ?? null)

  function getRecordById(id: string): MusicRecord | undefined {
    return musicRecords.value.find((r) => r.id === id)
  }

  function createRecord(noteIds: string[], name?: string): MusicRecord {
    const safeIds = [...noteIds]
    const record: MusicRecord = {
      id: generateId(),
      name: name?.trim() ? name.trim() : `唱片-${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      noteIds: safeIds,
    }
    musicRecords.value = [record, ...musicRecords.value]
    persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
    return record
  }

  function renameRecord(recordId: string, nextName: string): void {
    const idx = musicRecords.value.findIndex((r) => r.id === recordId)
    if (idx < 0) return
    const existing = musicRecords.value[idx]
    if (!existing) return
    musicRecords.value[idx] = { ...existing, name: nextName.trim() }
    persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
  }

  function setPinned(recordId: string | null): void {
    pinnedId.value = recordId
    persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
  }

  function shareRecord(recordId: string): string | null {
    const record = getRecordById(recordId)
    if (!record) return null
    const payload = { v: 1, noteIds: record.noteIds, name: record.name }
    return encodeShare(payload)
  }

  function importShareCode(code: string): MusicRecord | null {
    const payload = decodeShare<{ v: number; noteIds: string[]; name?: string }>(code)
    if (!payload || payload.v !== 1) return null
    if (!Array.isArray(payload.noteIds)) return null
    const noteIds = payload.noteIds.filter(Boolean)
    return createRecord(noteIds, payload.name ?? undefined)
  }

  function removeRecord(recordId: string): void {
    musicRecords.value = musicRecords.value.filter((r) => r.id !== recordId)
    if (pinnedId.value === recordId) pinnedId.value = null

    const url = mp3UrlCache.get(recordId)
    if (url) {
      URL.revokeObjectURL(url)
      mp3UrlCache.delete(recordId)
    }

    delete mp3ReadyAt.value[recordId]
    persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
  }

  async function ensureRecordMp3(recordId: string): Promise<boolean> {
    if (mp3ReadyAt.value[recordId] != null) return true

    const readyInDb = await hasRecordMp3(recordId).catch(() => false)
    if (readyInDb) {
      mp3ReadyAt.value[recordId] = Date.now()
      persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
      return true
    }

    const record = getRecordById(recordId)
    if (!record) return false

    const blob = await renderRecordMp3FromNoteIds(record.noteIds)
    await putRecordMp3(recordId, blob)

    mp3ReadyAt.value[recordId] = Date.now()
    persistMusic(musicRecords.value, pinnedId.value, mp3ReadyAt.value)
    return true
  }

  async function getRecordMp3ObjectUrl(recordId: string): Promise<string | null> {
    const cached = mp3UrlCache.get(recordId)
    if (cached) return cached

    const blob = await getRecordMp3Blob(recordId)
    if (!blob) return null

    const url = URL.createObjectURL(blob)
    mp3UrlCache.set(recordId, url)
    return url
  }

  async function playRecord(recordId: string): Promise<void> {
    const record = getRecordById(recordId)
    if (!record) return

    const audio = useAudioEngine()

    // 優先播放已輸出的 mp3
    const ok = await ensureRecordMp3(recordId).catch(() => false)
    if (ok) {
      const url = await getRecordMp3ObjectUrl(recordId)
      if (url) {
        await audio.playMp3OnceUrl(url, { durationMs: 30_000 })
        return
      }
    }

    // fallback：如果 mp3 生成失敗，仍保留原本合成播放
    await audio.playRecordByNoteIds(record.noteIds)
  }

  return {
    musicRecords,
    pinnedId,
    pinnedRecord,
    getRecordById,
    createRecord,
    renameRecord,
    setPinned,
    playRecord,
    ensureRecordMp3,
    getRecordMp3ObjectUrl,
    shareRecord,
    importShareCode,
    removeRecord,
  }
})

