import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type BackgroundState = { kind: 'none' } | { kind: 'note'; trackId: string } | { kind: 'record'; trackId: string }

const STORAGE_KEY = 'timer_background_v1'

function load(): BackgroundState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { kind: 'none' }
    const parsed = JSON.parse(raw) as BackgroundState
    if (!parsed || typeof parsed !== 'object') return { kind: 'none' }
    if (parsed.kind === 'none') return { kind: 'none' }
    if (parsed.kind === 'note') {
      const trackId = (parsed as { trackId?: unknown }).trackId
      if (typeof trackId === 'string') return parsed
    }
    if (parsed.kind === 'record') {
      const trackId = (parsed as { trackId?: unknown }).trackId
      if (typeof trackId === 'string') return parsed
    }
    return { kind: 'none' }
  } catch {
    return { kind: 'none' }
  }
}

function persist(state: BackgroundState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export const useBackgroundStore = defineStore('background', () => {
  const state = ref<BackgroundState>(load())

  const selectedKind = computed(() => state.value.kind)
  const selectedTrackId = computed(() => ('trackId' in state.value ? state.value.trackId : null))

  function setNone() {
    state.value = { kind: 'none' }
    persist(state.value)
  }

  function setNoteBackground(noteId: string) {
    state.value = { kind: 'note', trackId: noteId }
    persist(state.value)
  }

  function setRecordBackground(recordId: string) {
    state.value = { kind: 'record', trackId: recordId }
    persist(state.value)
  }

  return {
    state,
    selectedKind,
    selectedTrackId,
    setNone,
    setNoteBackground,
    setRecordBackground,
  }
})

