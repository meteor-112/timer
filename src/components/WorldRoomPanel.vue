<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getFragmentById } from '@/data/audioCatalog'
import { useWorldStore } from '@/stores/world'
import { useMusicStore } from '@/stores/music'
import { useFragmentsStore } from '@/stores/fragments'
import { useTimerStore } from '@/stores/timer'
import { useAudioEngine } from '@/composables/useAudioEngine'
import type { WorldUser } from '@/stores/world'

const world = useWorldStore()
const music = useMusicStore()
const fragments = useFragmentsStore()
const timer = useTimerStore()
const audio = useAudioEngine()

const nowMs = ref(Date.now())
let nowHandle: number | null = null

onMounted(() => {
  world.initSimulation({ size: 5 })
  nowHandle = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  world.stopSimulation()
  if (nowHandle != null) window.clearInterval(nowHandle)
  stopPinnedPlayback()
})

function formatFocusMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function colorForNoteId(id: string): string {
  return getFragmentById(id)?.color ?? '#acd7ff'
}

const selfPinnedNoteIds = computed(() => {
  if (music.pinnedRecord) return music.pinnedRecord.noteIds
  if (fragments.unlockedNoteIds.length) return fragments.unlockedNoteIds.slice(0, 3)
  return ['dawn', 'mint']
})

const selfPrimaryId = computed(() => selfPinnedNoteIds.value[0] ?? 'dawn')

const focusUsers = computed(() => {
  const list: Array<{
    id: string
    name: string
    isSelf: boolean
    focusStartedAtMs: number
    pinnedNoteIds: string[]
    pinnedPrimaryId: string
    isFocusing: boolean
    pinnedRecordId?: string | null
  }> = []

  if (timer.status === 'running') {
    const pinnedRecordId = music.pinnedRecord?.id ?? null
    list.push({
      id: 'self',
      name: '你',
      isSelf: true,
      focusStartedAtMs: Date.now() - timer.elapsedMs,
      pinnedNoteIds: selfPinnedNoteIds.value,
      pinnedPrimaryId: selfPrimaryId.value,
      isFocusing: true,
      pinnedRecordId,
    })
  }

  for (const u of world.focusingUsers) {
    list.push({ ...u, isSelf: false })
  }
  return list
})

const playingUserId = ref<string | null>(null)
let playbackAudioEl: HTMLAudioElement | null = null

function stopPinnedPlayback() {
  playingUserId.value = null
  if (!playbackAudioEl) return
  try {
    playbackAudioEl.pause()
    playbackAudioEl.currentTime = 0
  } catch {
    // ignore
  }
  playbackAudioEl = null
}

async function togglePinnedForUser(
  u: WorldUser & { pinnedRecordId?: string | null } | { id: string; pinnedNoteIds: string[]; pinnedRecordId?: string | null },
) {
  if (playingUserId.value === u.id) {
    stopPinnedPlayback()
    return
  }

  stopPinnedPlayback()

  const pinnedRecordId = (u as { pinnedRecordId?: string | null }).pinnedRecordId
  if (pinnedRecordId) {
    const ok = await music.ensureRecordMp3(pinnedRecordId).catch(() => false)
    if (ok) {
      const url = await music.getRecordMp3ObjectUrl(pinnedRecordId)
      if (url) {
        const el = new Audio(url)
        playbackAudioEl = el
        playingUserId.value = u.id
        el.onended = () => {
          if (playbackAudioEl === el) stopPinnedPlayback()
        }
        void el.play().catch(() => stopPinnedPlayback())
        return
      }
    }
  }

  const fallbackId = u.pinnedNoteIds[0]
  const fallbackUrl = fallbackId ? getFragmentById(fallbackId)?.trackAudioUrl : null
  if (fallbackUrl) {
    const el = new Audio(fallbackUrl)
    playbackAudioEl = el
    playingUserId.value = u.id
    el.onended = () => {
      if (playbackAudioEl === el) stopPinnedPlayback()
    }
    void el.play().catch(() => stopPinnedPlayback())
    return
  }

  // 最後退路：若無可用 mp3，仍保留舊合成播放（此分支無法精準停止）
  playingUserId.value = u.id
  await audio.playRecordByNoteIds(u.pinnedNoteIds).catch(() => {
    // ignore
  })
  playingUserId.value = null
}
</script>

<template>
  <section class="card p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">世界系統</div>
        <div class="mt-1 text-lg font-semibold" style="color: var(--text)">房間 {{ world.roomId }}</div>
        <div class="mt-1 text-sm" style="color: rgba(79, 93, 93, 0.78)">
          本版先以「本機模擬」展示正在專注的人。你按下點擊後可播放他們的置頂唱片/合成。
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="world.roomId"
          type="text"
          class="w-40 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
        />
        <button
          class="px-3 py-2 rounded-xl text-sm"
          style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
          @click="world.setRoomId(world.roomId)"
        >
          確定
        </button>
      </div>
    </div>

    <div class="mt-4">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">正在專注的人（點音符聆聽置頂）</div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="u in focusUsers"
          :key="u.id"
          class="rounded-2xl p-3"
          style="background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(79, 93, 93, 0.10)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold" style="color: var(--text)">{{ u.name }}</div>
              <div class="text-xs" style="color: rgba(79, 93, 93, 0.72)">
                已專注：{{ formatFocusMs(nowMs - u.focusStartedAtMs) }}
              </div>
              <div class="text-xs mt-1" style="color: rgba(79, 93, 93, 0.72)">
                置頂音符：
                <span :style="{ color: colorForNoteId(u.pinnedPrimaryId), fontWeight: 700 }">
                  {{ fragments.getFragmentLabel(u.pinnedPrimaryId) }}
                </span>
              </div>
            </div>

            <button
              class="h-12 w-12 rounded-2xl flex items-center justify-center"
              :style="{
                background: `linear-gradient(180deg, ${colorForNoteId(u.pinnedPrimaryId)}33, rgba(255,255,255,0))`,
                border: `1px solid ${colorForNoteId(u.pinnedPrimaryId)}55`,
                boxShadow: `0 0 20px ${colorForNoteId(u.pinnedPrimaryId)}22`,
              }"
              title="播放或終止置頂音樂"
              @click="togglePinnedForUser(u)"
            >
              <span style="font-size: 12px; font-weight: 800; color: rgba(79, 93, 93, 0.9)">
                {{ playingUserId === u.id ? '■' : '▶' }}
              </span>
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="id in u.pinnedNoteIds.slice(0, 4)"
              :key="id"
              class="px-2 py-1 rounded-xl text-xs"
              style="background: rgba(172, 215, 255, 0.10); border: 1px solid rgba(172, 215, 255, 0.20)"
            >
              {{ fragments.getFragmentLabel(id) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="focusUsers.length === 0" class="mt-3 text-sm" style="color: rgba(79, 93, 93, 0.7)">
        目前沒有任何人正在專注。啟動你的番茄鐘後，房間清單會出現你自己。
      </div>
    </div>
  </section>
</template>

