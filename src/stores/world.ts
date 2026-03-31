import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { get, onDisconnect, onValue, ref as dbRef, serverTimestamp, set, update, type DatabaseReference } from 'firebase/database'
import { firebaseDb } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth'
import { useTimerStore } from '@/stores/timer'
import { useMusicStore } from '@/stores/music'
import { useFragmentsStore } from '@/stores/fragments'

export type WorldUser = {
  id: string
  name: string
  message?: string
  status: 'focus' | 'rest'
  statusSinceMs: number
  // 置頂唱片（用 noteIds 來播放/合成）
  pinnedNoteIds: string[]
  pinnedPrimaryId: string
}

type PresenceRecord = {
  uid: string
  name: string
  message?: string
  status: 'focus' | 'rest'
  statusSinceMs: number
  pinnedNoteIds: string[]
  pinnedPrimaryId: string
  lastActiveAt: object | number
  lastActiveMs: number
}

const ROOM_ID = '001'
const ACTIVE_TTL_MS = 60_000

export const useWorldStore = defineStore('world', () => {
  const roomId = ref(ROOM_ID)
  const others = ref<WorldUser[]>([])
  const isConnected = ref(false)

  const focusingUsers = computed(() => others.value.filter((u) => u.status === 'focus'))

  const auth = useAuthStore()
  const timer = useTimerStore()
  const music = useMusicStore()
  const fragments = useFragmentsStore()

  let selfRef: DatabaseReference | null = null
  let roomRef: DatabaseReference | null = null
  let stopRoomListener: (() => void) | null = null
  let heartbeatHandle: number | null = null

  const selfPinnedNoteIds = computed(() => {
    if (music.pinnedRecord) return music.pinnedRecord.noteIds
    if (fragments.unlockedNoteIds.length) return fragments.unlockedNoteIds.slice(0, 3)
    return ['dawn', 'mint']
  })

  const selfPrimaryId = computed(() => selfPinnedNoteIds.value[0] ?? 'dawn')

  const selfStatus = computed<'focus' | 'rest'>(() => (timer.status === 'running' ? 'focus' : 'rest'))
  const selfStatusSinceMs = computed(() => {
    if (selfStatus.value === 'focus') return Date.now() - timer.elapsedMs
    return Date.now()
  })

  function cleanup() {
    if (heartbeatHandle != null) window.clearInterval(heartbeatHandle)
    heartbeatHandle = null
    if (stopRoomListener) stopRoomListener()
    stopRoomListener = null
    selfRef = null
    roomRef = null
    isConnected.value = false
    others.value = []
  }

  function normalizeRoomUsers(raw: unknown, selfUid: string | null): WorldUser[] {
    if (!raw || typeof raw !== 'object') return []
    const entries = Object.entries(raw as Record<string, unknown>)
    const now = Date.now()
    const list: WorldUser[] = []
    for (const [uid, v] of entries) {
      if (!v || typeof v !== 'object') continue
      if (selfUid && uid === selfUid) continue
      const rec = v as Partial<PresenceRecord>
      if (typeof rec.uid !== 'string') continue
      if (typeof rec.name !== 'string') continue
      if (rec.status !== 'focus' && rec.status !== 'rest') continue
      if (typeof rec.statusSinceMs !== 'number') continue
      if (!Array.isArray(rec.pinnedNoteIds) || rec.pinnedNoteIds.some((x) => typeof x !== 'string')) continue
      if (typeof rec.pinnedPrimaryId !== 'string') continue

      const lastActiveMs =
        typeof (rec as { lastActiveMs?: unknown }).lastActiveMs === 'number'
          ? (rec as { lastActiveMs: number }).lastActiveMs
          : now
      if (now - lastActiveMs > ACTIVE_TTL_MS) continue

      list.push({
        id: rec.uid,
        name: rec.name,
        message: typeof rec.message === 'string' ? rec.message : '',
        status: rec.status,
        statusSinceMs: rec.statusSinceMs,
        pinnedNoteIds: rec.pinnedNoteIds,
        pinnedPrimaryId: rec.pinnedPrimaryId,
      })
    }
    return list.sort((a, b) => b.statusSinceMs - a.statusSinceMs)
  }

  async function writeSelfPresence() {
    if (!selfRef) return
    const uid = auth.uid
    if (!uid) return

    const rec: PresenceRecord = {
      uid,
      name: auth.displayName,
      message: auth.profile.message?.trim() ?? '',
      status: selfStatus.value,
      statusSinceMs: selfStatusSinceMs.value,
      pinnedNoteIds: selfPinnedNoteIds.value,
      pinnedPrimaryId: selfPrimaryId.value,
      lastActiveAt: serverTimestamp(),
      lastActiveMs: Date.now(),
    }
    await set(selfRef, rec).catch((e) => {
       
      console.warn('[world] presence write failed:', e)
    })
  }

  async function connect() {
    auth.init()
    if (!auth.uid) return
    let db
    try {
      db = firebaseDb()
    } catch {
      // Firebase 未設定時，世界房間維持離線狀態
      return
    }
    const uid = auth.uid
    roomRef = dbRef(db, `rooms/${roomId.value}/presence`)
    selfRef = dbRef(db, `rooms/${roomId.value}/presence/${uid}`)

    await set(selfRef, {
      uid,
      name: auth.displayName,
      message: auth.profile.message?.trim() ?? '',
      status: selfStatus.value,
      statusSinceMs: selfStatusSinceMs.value,
      pinnedNoteIds: selfPinnedNoteIds.value,
      pinnedPrimaryId: selfPrimaryId.value,
      lastActiveAt: serverTimestamp(),
      lastActiveMs: Date.now(),
    } satisfies PresenceRecord).catch((e) => {
       
      console.warn('[world] presence write failed:', e)
    })

    void onDisconnect(selfRef).remove().catch(() => {})

    stopRoomListener = onValue(roomRef, (snap) => {
      const raw = snap.val()
      others.value = normalizeRoomUsers(raw, uid)
      isConnected.value = true
    })

    // 主動測試讀取權限：若 rules 擋住 rooms/001/presence 的 read，
    // other users 就會永遠是空陣列。
    void get(roomRef).catch((e) => {
       
      console.warn('[world] presence read failed:', e)
    })

    if (heartbeatHandle != null) window.clearInterval(heartbeatHandle)
    heartbeatHandle = window.setInterval(() => {
      if (!selfRef) return
      void update(selfRef, { lastActiveAt: serverTimestamp(), lastActiveMs: Date.now() }).catch((e) => {
         
        console.warn('[world] presence heartbeat update failed:', e)
      })
    }, 25_000)
  }

  function disconnect() {
    cleanup()
  }

  // 當登入狀態/資料改變時，更新 presence
  watch(
    () => auth.uid,
    async (uid) => {
      cleanup()
      if (!uid) return
      await connect()
    },
    { immediate: true },
  )

  watch(
    () => [auth.displayName, auth.profile.message, selfStatus.value, selfPinnedNoteIds.value.join('|')],
    () => {
      void writeSelfPresence()
    },
  )

  return {
    roomId,
    others,
    focusingUsers,
    isConnected,
    connect,
    disconnect,
  }
})

