import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { legacyMixFromNoteIds, renderRecordMp3FromMix, type MixTrack } from '@/composables/renderRecordTone'
import { getRecordMp3Blob, hasRecordMp3, putRecordMp3 } from '@/utils/idb/recordMp3Db'

export type MusicTrackMix = MixTrack

export type MusicRecord = {
  id: string
  name: string
  createdAt: number
  /** 向後相容：舊資料僅有 noteIds；新資料以 mix 為準 */
  noteIds: string[]
  mix?: MusicTrackMix[]
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

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function normalizeRecord(r: MusicRecord): MusicRecord {
  if (r.mix && r.mix.length) return r
  return { ...r, mix: legacyMixFromNoteIds(r.noteIds) }
}

function loadMusic(): MusicPersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { records: [], pinnedRecordId: null, mp3ReadyAtByRecordId: {} }
    const parsed = JSON.parse(raw) as MusicPersistState
    const base = parsed ?? { records: [], pinnedRecordId: null, mp3ReadyAtByRecordId: {} }
    const records = (base.records ?? []).map(normalizeRecord)
    return { ...base, records }
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

function getMixForRecord(record: MusicRecord): MusicTrackMix[] {
  if (record.mix?.length) return record.mix.slice(0, 5)
  return legacyMixFromNoteIds(record.noteIds)
}

export const useMusicStore = defineStore('music', () => {
  const { records, pinnedRecordId, mp3ReadyAtByRecordId } = loadMusic()
  const musicRecords = ref<MusicRecord[]>(records)
  const pinnedId = ref<string | null>(pinnedRecordId)
  const mp3ReadyAt = ref<Record<string, number>>(mp3ReadyAtByRecordId ?? {})

  const mp3UrlCache = new Map<string, string>()

  const pinnedRecord = computed(() => musicRecords.value.find((r) => r.id === pinnedId.value) ?? null)

  function getRecordById(id: string): MusicRecord | undefined {
    return musicRecords.value.find((r) => r.id === id)
  }

  function createRecord(mix: MusicTrackMix[], name?: string): MusicRecord {
    const safe = mix.slice(0, 5).map((m) => ({
      noteId: m.noteId,
      offsetSec: Math.max(0, m.offsetSec),
      volume: clamp01(m.volume),
    }))
    const record: MusicRecord = {
      id: generateId(),
      name: name?.trim() ? name.trim() : `唱片-${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      noteIds: safe.map((m) => m.noteId),
      mix: safe,
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
    const mix = getMixForRecord(record)
    const payload = { v: 2 as const, mix, name: record.name }
    return encodeShare(payload)
  }

  function importShareCode(code: string): MusicRecord | null {
    const payload = decodeShare<{ v?: number; noteIds?: string[]; mix?: MusicTrackMix[]; name?: string }>(code)
    if (!payload) return null
    if (payload.v === 2 && Array.isArray(payload.mix) && payload.mix.length) {
      return createRecord(payload.mix, payload.name ?? undefined)
    }
    if (Array.isArray(payload.noteIds) && payload.noteIds.length) {
      return createRecord(legacyMixFromNoteIds(payload.noteIds.filter(Boolean)), payload.name ?? undefined)
    }
    return null
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

    const mix = getMixForRecord(record)
    const blob = await renderRecordMp3FromMix(mix)
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

    const ok = await ensureRecordMp3(recordId).catch(() => false)
    if (ok) {
      const url = await getRecordMp3ObjectUrl(recordId)
      if (url) {
        await audio.playMp3OnceUrl(url, { durationMs: 30_000 })
        return
      }
    }

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
