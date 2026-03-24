export type FragmentType = {
  id: string
  label: string
  color: string
  baseFrequencyHz: number
  // 使用同一個 mp3 檔來代表「碎片」與「音軌」；碎片會截到前 5 秒播放
  trackAudioUrl: string
}

export const FOCUS_INTERVAL_MINUTES = 25

export const REMINDER_DURATION_MS = 3_000
export const FRAGMENT_DURATION_MS = 5_000
export const NOTE_MAX_DURATION_MS = 30_000

// 提醒音：每次 25 分鐘播放一次（3 秒）
export const REMINDER_AUDIO_URL = '/audio/reminder.mp3'

// 這份 catalog 對應你放進 `public/audio/tracks/*.mp3` 的檔名。
// 你如果檔名不同，請在這裡改成正確的 URL。
export const FRAGMENT_TYPES: FragmentType[] = [
  { id: 'dawn', label: '鳥鳴', color: '#acd7ff', baseFrequencyHz: 220, trackAudioUrl: '/audio/tracks/birds.mp3' },
  { id: 'mint', label: '吉他', color: '#97ce50', baseFrequencyHz: 247, trackAudioUrl: '/audio/tracks/guitar-1.mp3' },
  { id: 'stone', label: '鋼琴', color: '#9cafaa', baseFrequencyHz: 196, trackAudioUrl: '/audio/tracks/piano-1.mp3' },
  { id: 'teal', label: '雨', color: '#7fb2b0', baseFrequencyHz: 262, trackAudioUrl: '/audio/tracks/rain.mp3' },
  { id: 'sky', label: '小提琴', color: '#9fc7e8', baseFrequencyHz: 294, trackAudioUrl: '/audio/tracks/violin-1.mp3' },
  { id: 'lime', label: '海浪', color: '#a8e063', baseFrequencyHz: 330, trackAudioUrl: '/audio/tracks/wave.mp3' },
]

export function getFragmentById(id: string): FragmentType | undefined {
  return FRAGMENT_TYPES.find((f) => f.id === id)
}

export type ToneStep = {
  freqHz: number
  durationMs: number
  detuneCents?: number
}

export type TonePattern = {
  // 以 frequency + 短段 duration 來排程（fallback：找不到 mp3 時使用）
  steps: ToneStep[]
  wave?: OscillatorType
  peakGain?: number
}

export function makeFragmentPattern(fragmentId: string): TonePattern {
  const frag = getFragmentById(fragmentId)
  const base = frag?.baseFrequencyHz ?? 220
  return {
    wave: 'triangle',
    peakGain: 0.22,
    steps: [
      { freqHz: base * 1.0, durationMs: 140 },
      { freqHz: base * 1.25, durationMs: 120 },
      { freqHz: base * 1.5, durationMs: 170 },
      { freqHz: base * 0.95, durationMs: 120 },
    ],
  }
}

export function makeNotePattern(noteId: string): TonePattern {
  const frag = getFragmentById(noteId)
  const base = frag?.baseFrequencyHz ?? 220
  return {
    wave: 'sine',
    peakGain: 0.18,
    steps: [
      { freqHz: base * 1.0, durationMs: 210 },
      { freqHz: base * 1.2, durationMs: 170 },
      { freqHz: base * 1.5, durationMs: 190 },
      { freqHz: base * 1.1, durationMs: 180 },
      { freqHz: base * 0.95, durationMs: 210 },
      { freqHz: base * 1.35, durationMs: 160 },
      { freqHz: base * 1.0, durationMs: 260 },
    ],
  }
}

export function makeReminderPattern(index: number): TonePattern {
  const base = 440
  const freq = base * (index % 2 === 0 ? 1 : 1.12246)
  return {
    wave: 'sine',
    peakGain: 0.16,
    steps: [
      { freqHz: freq, durationMs: 140 },
      { freqHz: freq * 1.25, durationMs: 90 },
      { freqHz: freq * 0.9, durationMs: 120 },
    ],
  }
}

export type RecordPattern = {
  recordId: string
  noteIds: string[]
  // 每拍的音長與步數，決定總長度是否接近 30 秒（fallback）
  stepDurationMs: number
  wave?: OscillatorType
}

export function makeRecordPattern(recordId: string, noteIds: string[]): RecordPattern {
  const stepDurationMs = 260
  return { recordId, noteIds, stepDurationMs, wave: 'sine' }
}

