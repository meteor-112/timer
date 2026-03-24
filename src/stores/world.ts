import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FRAGMENT_TYPES } from '@/data/audioCatalog'

export type WorldUser = {
  id: string
  name: string
  // 模擬：是否正在專注
  isFocusing: boolean
  focusStartedAtMs: number
  // 置頂唱片（用 noteIds 來合成）
  pinnedNoteIds: string[]
  // 便於 UI 顯示：用第一個 noteId 的顏色
  pinnedPrimaryId: string
}

const NAMES = ['林夏', '子晴', '柏宇', '瑋婷', '俊廷', '妤安', '浩然', '郁琳', '冠霖', '品潔']

function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `u_${Date.now()}_${Math.floor(Math.random() * 10_000)}`
  }
}

function pickRandomName(used: Set<string>): string {
  for (let i = 0; i < 10; i++) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)] ?? NAMES[0] ?? '匿名'
    if (!used.has(name)) return name
  }
  return NAMES[Math.floor(Math.random() * NAMES.length)] ?? NAMES[0] ?? '匿名'
}

function randomPinnedNotes(): { noteIds: string[]; primaryId: string } {
  const pool = FRAGMENT_TYPES.map((f) => f.id)
  const count = 3 + Math.floor(Math.random() * 3) // 3~5
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const noteIds = shuffled.slice(0, count)
  return { noteIds, primaryId: noteIds[0] ?? pool[0] ?? 'dawn' }
}

const STORAGE_KEY = 'timer_world_room_v1'

function loadRoomId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ?? `room-${Math.random().toString(16).slice(2, 8)}`
  } catch {
    return `room-${Math.random().toString(16).slice(2, 8)}`
  }
}

function persistRoomId(roomId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, roomId)
  } catch {
    // ignore
  }
}

export const useWorldStore = defineStore('world', () => {
  const roomId = ref(loadRoomId())
  const others = ref<WorldUser[]>([])

  const focusingUsers = computed(() => others.value.filter((u) => u.isFocusing))

  let simHandle: number | null = null

  function stopSimulation() {
    if (simHandle != null) {
      window.clearInterval(simHandle)
      simHandle = null
    }
  }

  function initSimulation(opts?: { size?: number }) {
    stopSimulation()
    const size = opts?.size ?? 5

    const usedNames = new Set<string>()
    const now = Date.now()
    others.value = Array.from({ length: size }).map(() => {
      const pinned = randomPinnedNotes()
      const name = pickRandomName(usedNames)
      usedNames.add(name)
      return {
        id: generateId(),
        name,
        isFocusing: Math.random() > 0.15,
        focusStartedAtMs: now - Math.floor(Math.random() * 50 * 60 * 1000),
        pinnedNoteIds: pinned.noteIds,
        pinnedPrimaryId: pinned.primaryId,
      }
    })

    simHandle = window.setInterval(() => {
      others.value = others.value.map((u) => {
        let isFocusing = u.isFocusing
        let focusStartedAtMs = u.focusStartedAtMs
        let pinnedNoteIds = u.pinnedNoteIds
        let pinnedPrimaryId = u.pinnedPrimaryId

        const switchChance = 0.18
        if (Math.random() < switchChance) {
          isFocusing = !u.isFocusing
          focusStartedAtMs = Date.now() - Math.floor(Math.random() * 20 * 60 * 1000)
        }

        const pinnedChance = 0.08
        if (Math.random() < pinnedChance) {
          const pinned = randomPinnedNotes()
          pinnedNoteIds = pinned.noteIds
          pinnedPrimaryId = pinned.primaryId
        }

        return { ...u, isFocusing, focusStartedAtMs, pinnedNoteIds, pinnedPrimaryId }
      })
    }, 15_000)
  }

  function setRoomId(next: string) {
    const clean = next.trim()
    if (!clean) return
    roomId.value = clean
    persistRoomId(clean)
  }

  return {
    roomId,
    others,
    focusingUsers,
    initSimulation,
    stopSimulation,
    setRoomId,
  }
})

