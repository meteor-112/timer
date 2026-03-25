<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog'
import { useFragmentsStore } from '@/stores/fragments'
import { useMusicStore, type MusicRecord, type MusicTrackMix } from '@/stores/music'

const fragments = useFragmentsStore()
const music = useMusicStore()

const tracks = ref<MusicTrackMix[]>([])
const recordName = ref('')
const pinAfterCreate = ref(true)
const generating = ref(false)
const previewPlaying = ref(false)
const playingRecordId = ref<string | null>(null)

let previewStopHandle: number | null = null
const previewStartHandles = new Set<number>()
let previewAudios: HTMLAudioElement[] = []
let recordAudioEl: HTMLAudioElement | null = null

const maxTracks = 5

const canAddTrack = computed(() => tracks.value.length < maxTracks && fragments.unlockedNoteIds.length > 0)

const canCreate = computed(() => {
  if (tracks.value.length < 1) return false
  if (tracks.value.length > maxTracks) return false
  const unlocked = new Set(fragments.unlockedNoteIds)
  return tracks.value.every((t) => t.noteId && unlocked.has(t.noteId))
})

function addTrack() {
  if (!canAddTrack.value) return
  const first = fragments.unlockedNoteIds[0] ?? ''
  tracks.value.push({
    noteId: first,
    offsetSec: 0,
    volume: 0.8,
  })
}

function removeTrack(idx: number) {
  tracks.value.splice(idx, 1)
}

function stopPreview() {
  previewPlaying.value = false
  if (previewStopHandle != null) {
    window.clearTimeout(previewStopHandle)
    previewStopHandle = null
  }
  for (const h of previewStartHandles) window.clearTimeout(h)
  previewStartHandles.clear()
  for (const a of previewAudios) {
    try {
      a.pause()
      a.currentTime = 0
    } catch {
      // ignore
    }
  }
  previewAudios = []
}

function stopRecordPlayback() {
  playingRecordId.value = null
  if (!recordAudioEl) return
  try {
    recordAudioEl.pause()
    recordAudioEl.currentTime = 0
  } catch {
    // ignore
  }
  recordAudioEl = null
}

async function togglePreview() {
  if (previewPlaying.value) {
    stopPreview()
    return
  }

  stopPreview()
  stopRecordPlayback()
  previewPlaying.value = true

  const playable = tracks.value
    .map((t) => ({ ...t, url: getFragmentById(t.noteId)?.trackAudioUrl }))
    .filter((t) => !!t.url)
    .slice(0, maxTracks)

  for (const t of playable) {
    const delay = Math.max(0, Math.min(30, t.offsetSec)) * 1000
    const h = window.setTimeout(() => {
      if (!previewPlaying.value) return
      const audio = new Audio(t.url!)
      audio.volume = Math.max(0, Math.min(1, t.volume))
      previewAudios.push(audio)
      void audio.play().catch(() => {
        // ignore
      })
    }, delay)
    previewStartHandles.add(h)
  }

  previewStopHandle = window.setTimeout(() => {
    stopPreview()
  }, 30_000)
}

function colorFor(noteId: string): string {
  return FRAGMENT_TYPES.find((f) => f.id === noteId)?.color ?? '#acd7ff'
}

async function createRecord() {
  if (!canCreate.value) return
  generating.value = true
  try {
    stopPreview()
    const record = music.createRecord([...tracks.value], recordName.value)
    await music.ensureRecordMp3(record.id)
    tracks.value = []
    recordName.value = ''
    if (pinAfterCreate.value) music.setPinned(record.id)
  } finally {
    generating.value = false
  }
}

const shareCode = ref('')
const importCode = ref('')

function startShare(recordId: string) {
  const code = music.shareRecord(recordId)
  shareCode.value = code ?? ''
}

async function doImport() {
  const code = importCode.value.trim()
  if (!code) return
  const record = music.importShareCode(code)
  if (record) {
    importCode.value = ''
    generating.value = true
    try {
      await music.ensureRecordMp3(record.id)
    } finally {
      generating.value = false
    }
    music.setPinned(record.id)
  }
}

async function copyShareCode() {
  const code = shareCode.value.trim()
  if (!code) return
  try {
    const nav = globalThis.navigator
    await nav.clipboard?.writeText(code)
  } catch {
    // ignore
  }
}

const editTargetId = ref<string | null>(null)
const editName = ref('')

function beginRename(record: MusicRecord) {
  editTargetId.value = record.id
  editName.value = record.name
}

function saveRename() {
  if (!editTargetId.value) return
  music.renameRecord(editTargetId.value, editName.value)
  editTargetId.value = null
}

function trackCountLabel(r: MusicRecord): number {
  return r.mix?.length ?? r.noteIds.length
}

async function toggleRecordPlayback(recordId: string) {
  if (playingRecordId.value === recordId) {
    stopRecordPlayback()
    return
  }

  stopPreview()
  stopRecordPlayback()

  const ok = await music.ensureRecordMp3(recordId).catch(() => false)
  if (!ok) return
  const url = await music.getRecordMp3ObjectUrl(recordId)
  if (!url) return

  const audio = new Audio(url)
  recordAudioEl = audio
  playingRecordId.value = recordId
  audio.onended = () => {
    if (recordAudioEl === audio) {
      stopRecordPlayback()
    }
  }
  void audio.play().catch(() => {
    stopRecordPlayback()
  })
}

onUnmounted(() => {
  stopPreview()
  stopRecordPlayback()
})
</script>

<template>
  <section class="card p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">音樂系統</div>
        <div class="mt-1 text-lg font-semibold" style="color: var(--text)">30 秒唱片製作（Tone.js）</div>
        <div class="mt-1 text-sm" style="color: rgba(79, 93, 93, 0.78)">
          最多選擇 5 條已解鎖音軌，可調整每條在時間軸上的位置與音量，合成 30 秒 MP3。
        </div>
      </div>
      <div class="accent-pill text-sm" style="color: var(--text)">
        <span
          class="inline-block h-2 w-2 rounded-full"
          style="background: var(--blue); box-shadow: 0 0 14px rgba(172, 215, 255, 0.65)"
        />
        <span>已解鎖音軌：{{ fragments.unlockedNoteIds.length }}</span>
      </div>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">混音軌（最多 {{ maxTracks }} 條）</div>
        <div class="flex items-center gap-2">
          <button
            v-if="tracks.length > 0"
            type="button"
            class="px-3 py-2 rounded-xl text-sm"
            style="background: rgba(156, 175, 170, 0.16); border: 1px solid rgba(156, 175, 170, 0.35)"
            @click="togglePreview"
          >
            {{ previewPlaying ? '終止試聽' : '試聽' }}
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-xl text-sm disabled:opacity-40"
            style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
            :disabled="!canAddTrack"
            @click="addTrack"
          >
            加入音軌
          </button>
        </div>
      </div>

      <div v-if="tracks.length === 0" class="mt-3 text-sm" style="color: rgba(79, 93, 93, 0.7)">
        點「加入音軌」開始編排。需先解鎖音軌。
      </div>

      <div class="mt-3 flex flex-col gap-3">
        <div
          v-for="(t, idx) in tracks"
          :key="idx"
          class="rounded-2xl p-3"
          style="background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(79, 93, 93, 0.1)"
        >
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="text-sm font-semibold" style="color: var(--text)">音軌 {{ idx + 1 }}</div>
            <button
              type="button"
              class="px-2 py-1 rounded-lg text-xs"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="removeTrack(idx)"
            >
              移除
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="block text-xs" style="color: rgba(79, 93, 93, 0.85)">
              音軌
              <select
                v-model="t.noteId"
                class="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-2 py-2 text-sm"
              >
                <option v-for="id in fragments.unlockedNoteIds" :key="id" :value="id">
                  {{ fragments.getFragmentLabel(id) }}
                </option>
              </select>
            </label>

            <label class="block text-xs" style="color: rgba(79, 93, 93, 0.85)">
              位置 {{ Number(t.offsetSec).toFixed(1) }} 秒（0–30）
              <input v-model.number="t.offsetSec" type="range" min="0" max="30" step="0.1" class="mt-2 w-full" />
            </label>

            <label class="block text-xs" style="color: rgba(79, 93, 93, 0.85)">
              音量 {{ Math.round(t.volume * 100) }}%
              <input v-model.number="t.volume" type="range" min="0" max="1" step="0.01" class="mt-2 w-full" />
            </label>
          </div>

          <div
            class="mt-2 h-1 rounded-full"
            :style="{
              background: `linear-gradient(90deg, ${colorFor(t.noteId)}55, rgba(255,255,255,0))`,
            }"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-end justify-between gap-3 flex-wrap">
      <div>
        <label class="text-sm" style="color: rgba(79, 93, 93, 0.85)">唱片名稱</label>
        <input
          v-model="recordName"
          type="text"
          class="mt-1 w-80 max-w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
          placeholder="例如：綠色靜心 - 30 秒"
        />
      </div>

      <label class="text-sm flex items-center gap-2" style="color: rgba(79, 93, 93, 0.85)">
        <input type="checkbox" v-model="pinAfterCreate" />
        製作後自動置頂
      </label>

      <button
        class="px-4 py-2 rounded-xl disabled:opacity-40"
        style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
        :disabled="!canCreate || generating"
        @click="createRecord"
      >
        {{ generating ? '正在輸出 mp3...' : '製作並儲存唱片' }}
      </button>
    </div>

    <div class="mt-4">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">你的唱片（可命名、分享、置頂）</div>
      <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="r in music.musicRecords"
          :key="r.id"
          class="rounded-2xl p-3"
          style="background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(79, 93, 93, 0.1)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-semibold" style="color: var(--text)">{{ r.name }}</div>
              <div class="text-xs" style="color: rgba(79, 93, 93, 0.7)">
                音軌數：{{ trackCountLabel(r) }} · {{ new Date(r.createdAt).toLocaleString() }}
              </div>
              <div v-if="music.pinnedId === r.id" class="text-xs mt-1" style="color: var(--green); font-weight: 700">
                已置頂
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
                @click="toggleRecordPlayback(r.id)"
              >
                {{ playingRecordId === r.id ? '終止' : '播放' }}
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(156, 175, 170, 0.14); border: 1px solid rgba(156, 175, 170, 0.35)"
              @click="music.setPinned(music.pinnedId === r.id ? null : r.id)"
            >
              {{ music.pinnedId === r.id ? '取消置頂' : '置頂' }}
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="beginRename(r)"
            >
              改名
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(172, 215, 255, 0.08); border: 1px solid rgba(172, 215, 255, 0.25)"
              @click="startShare(r.id)"
            >
              分享
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="music.removeRecord(r.id)"
            >
              刪除
            </button>
          </div>

          <div v-if="editTargetId === r.id" class="mt-3">
            <input
              v-model="editName"
              type="text"
              class="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
            />
            <div class="mt-2 flex gap-2">
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
                @click="saveRename"
              >
                儲存改名
              </button>
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
                @click="editTargetId = null"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <div v-if="music.musicRecords.length === 0" class="mt-3 text-sm" style="color: rgba(79, 93, 93, 0.7)">
          編排音軌後按下製作，會輸出 30 秒 MP3。
        </div>
      </div>
    </div>

    <div class="mt-5">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">分享 / 匯入</div>
      <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div class="text-xs" style="color: rgba(79, 93, 93, 0.75)">目前分享碼（按下某張唱片的「分享」會自動填入）</div>
          <textarea
            v-model="shareCode"
            class="mt-1 w-full min-h-28 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
          />
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
              :disabled="!shareCode.trim()"
              @click="copyShareCode"
            >
              複製分享碼
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="shareCode = ''"
            >
              清空
            </button>
          </div>
        </div>

        <div>
          <div class="text-xs" style="color: rgba(79, 93, 93, 0.75)">匯入分享碼（會產生新唱片並自動置頂）</div>
          <textarea
            v-model="importCode"
            class="mt-1 w-full min-h-28 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
            placeholder="貼上分享碼後按下匯入"
          />
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
              :disabled="!importCode.trim()"
              @click="doImport"
            >
              匯入並置頂
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="importCode = ''"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
