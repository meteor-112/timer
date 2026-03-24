<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Play, Square } from 'lucide-vue-next'
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog'
import { useFragmentsStore } from '@/stores/fragments'
import { useMusicStore } from '@/stores/music'

const fragments = useFragmentsStore()
const music = useMusicStore()

type SelectionKind = 'note' | 'record'

const kind = ref<SelectionKind>('note')
const selectedNoteId = ref<string>('')
const selectedRecordId = ref<string>('')

const acquiredNotes = computed(() => FRAGMENT_TYPES.filter((f) => fragments.getCount(f.id) > 0))

const selectedLabel = computed(() => {
  if (kind.value === 'note') return fragments.getFragmentLabel(selectedNoteId.value)
  const rec = music.getRecordById(selectedRecordId.value)
  return rec?.name ?? '唱片'
})

const isPlaying = ref(false)
let audioEl: HTMLAudioElement | null = null
let recordLoopHandle: number | null = null

function stop() {
  isPlaying.value = false
  if (recordLoopHandle != null) {
    window.clearTimeout(recordLoopHandle)
    recordLoopHandle = null
  }
  if (audioEl) {
    try {
      audioEl.pause()
      audioEl.currentTime = 0
    } catch {
      // ignore
    }
    audioEl = null
  }
}

async function startLoop() {
  stop()

  if (kind.value === 'note') {
    const id = selectedNoteId.value
    if (!id) return
    const url = getFragmentById(id)?.trackAudioUrl
    if (!url) return

    audioEl = new Audio(url)
    audioEl.loop = true
    audioEl.volume = 0.95
    isPlaying.value = true
    void audioEl.play().catch(() => {
      stop()
    })
    return
  }

  const recordId = selectedRecordId.value
  if (!recordId) return

  // 優先用 mp3 來 loop
  const ok = await music.ensureRecordMp3(recordId).catch(() => false)
  if (ok) {
    const url = await music.getRecordMp3ObjectUrl(recordId)
    if (url) {
      audioEl = new Audio(url)
      audioEl.loop = true
      audioEl.volume = 0.95
      isPlaying.value = true
      void audioEl.play().catch(() => {
        stop()
      })
      return
    }
  }

  // fallback：用 30 秒一次的播放做簡易循環
  isPlaying.value = true
  const playOnceThenSchedule = async () => {
    if (!isPlaying.value) return
    await music.playRecord(recordId).catch(() => {
      // ignore
    })
    if (!isPlaying.value) return
    recordLoopHandle = window.setTimeout(() => {
      void playOnceThenSchedule()
    }, 30_000)
  }
  void playOnceThenSchedule()
}

function togglePlay() {
  if (isPlaying.value) stop()
  else void startLoop()
}

onUnmounted(() => stop())
</script>

<template>
  <div class="player-shell">
    <div class="player-top">
      <div class="player-title">{{ selectedLabel }}</div>
    </div>

    <div class="player-controls">
      <button class="big-play" @click="togglePlay" :disabled="kind === 'note' ? !selectedNoteId : !selectedRecordId" aria-label="播放/停止">
        <Play v-if="!isPlaying" class="h-7 w-7 ml-0.5" />
        <Square v-else class="h-6 w-6" />
      </button>
    </div>

    <div class="picker">
      <div class="row">
        <label class="label">類型</label>
        <select v-model="kind" class="select">
          <option value="note">音效</option>
          <option value="record">唱片</option>
        </select>
      </div>

      <div class="row" v-if="kind === 'note'">
        <label class="label">音效</label>
        <select v-model="selectedNoteId" class="select" @change="stop()">
          <option value="" disabled>選擇曾獲取過的音效</option>
          <option v-for="f in acquiredNotes" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
      <div class="hint" v-if="kind === 'note' && acquiredNotes.length === 0">尚未獲取任何音效</div>

      <div class="row" v-if="kind === 'record'">
        <label class="label">唱片</label>
        <select v-model="selectedRecordId" class="select" @change="stop()">
          <option value="" disabled>選擇已儲存的唱片</option>
          <option v-for="r in music.musicRecords" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <div class="hint" v-if="kind === 'record' && music.musicRecords.length === 0">尚未儲存任何唱片</div>
    </div>
  </div>
</template>

<style scoped>
.player-shell {
  width: 360px;
  max-width: calc(100vw - 24px);
  background: rgba(55, 61, 73, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
  padding: 12px 14px;
  color: rgba(255, 255, 255, 0.92);
  position: relative;
}
.player-top {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 10px;
}
.player-title {
  font-weight: 700;
  text-align: center;
  user-select: none;
}
.player-controls {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.big-play {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: rgba(30, 36, 48, 0.95);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}
.big-play:disabled {
  opacity: 0.45;
}
.big-play:not(:disabled):active {
  transform: scale(0.98);
}
.picker {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 10px;
  align-items: center;
}
.label {
  font-size: 12px;
  opacity: 0.8;
}
.select {
  width: 100%;
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.92);
  color: rgba(30, 36, 48, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  outline: none;
}
.hint {
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
}
</style>

