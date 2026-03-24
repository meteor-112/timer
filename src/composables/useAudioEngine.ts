import {
  makeFragmentPattern,
  makeNotePattern,
  makeReminderPattern,
  makeRecordPattern,
  getFragmentById,
  FRAGMENT_TYPES,
  REMINDER_AUDIO_URL,
  REMINDER_DURATION_MS,
  FRAGMENT_DURATION_MS,
  NOTE_MAX_DURATION_MS,
  type TonePattern,
} from '@/data/audioCatalog'
import type { RecordPattern } from '@/data/audioCatalog'

type PlayResult = {
  ok: boolean
  reason?: string
  durationMs?: number
}

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function ensureAudioContext(): AudioContext | null {
  if (audioCtx && masterGain) return audioCtx
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null

  audioCtx = new Ctx()
  masterGain = audioCtx.createGain()
  masterGain.gain.value = 0.9
  masterGain.connect(audioCtx.destination)
  return audioCtx
}

async function resumeIfNeeded(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // ignore
    }
  }
}

function scheduleTonePattern(pattern: TonePattern, startAtSec: number): number {
  const ctx = audioCtx
  const master = masterGain
  if (!ctx || !master) return 0

  const peakGain = pattern.peakGain ?? 0.18
  const wave = pattern.wave ?? 'sine'

  let t = startAtSec
  let totalMs = 0

  for (const step of pattern.steps) {
    const durSec = Math.max(0.02, step.durationMs / 1000)
    totalMs += step.durationMs

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = wave
    osc.frequency.setValueAtTime(step.freqHz, t)
    if (step.detuneCents) osc.detune.setValueAtTime(step.detuneCents, t)

    // 避免 click：起始低值，然後快速 ramp 到峰值，再 ramp 回去
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peakGain, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec)

    osc.connect(gain)
    gain.connect(master)

    osc.start(t)
    osc.stop(t + durSec + 0.03)

    t += durSec
  }

  return totalMs
}

function scheduleRecord(pattern: RecordPattern, startAtSec: number, recordDurationMs = 30_000): number {
  const ctx = audioCtx
  const master = masterGain
  if (!ctx || !master) return 0

  const { noteIds, stepDurationMs, wave } = pattern
  const safeNoteIds = noteIds.length ? noteIds : FRAGMENT_TYPES.slice(0, 2).map((f) => f.id)

  const startFreq = safeNoteIds
    .map((id) => getFragmentById(id)?.baseFrequencyHz)
    .filter((n): n is number => typeof n === 'number')
  if (!startFreq.length) return 0

  const steps = Math.max(10, Math.floor(recordDurationMs / stepDurationMs))
  let t = startAtSec

  for (let i = 0; i < steps; i++) {
    const idx = i % startFreq.length
    const freq = startFreq[idx]!

    const durSec = Math.max(0.03, (stepDurationMs / 1000) * 0.65)
    const peakGain = 0.12 + (idx % 3) * 0.02

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave ?? 'sine'
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peakGain, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec)

    osc.connect(gain)
    gain.connect(master)

    osc.start(t)
    osc.stop(t + durSec + 0.03)

    t += stepDurationMs / 1000
  }

  return recordDurationMs
}

export function useAudioEngine() {
  async function ensureUnlocked(): Promise<PlayResult> {
    const ctx = ensureAudioContext()
    if (!ctx) return { ok: false, reason: 'AudioContext not supported' }
    await resumeIfNeeded(ctx)
    return { ok: true }
  }

  function playMp3Once(url: string, opts?: { durationMs?: number; offsetMs?: number; volume?: number }): PlayResult {
    const durationMs = opts?.durationMs ?? 0
    const offsetMs = opts?.offsetMs ?? 0
    if (!durationMs || durationMs <= 0) return { ok: false, reason: 'Invalid duration' }

    // 每次都用新 Audio 物件，避免重疊/停止互相影響
    const audio = new Audio(url)
    audio.volume = typeof opts?.volume === 'number' ? Math.max(0, Math.min(1, opts.volume)) : 0.9

    if (offsetMs > 0) audio.currentTime = offsetMs / 1000

    void audio.play().catch(() => {
      // ignore
    })

    const stopAfter = Math.max(0, durationMs - offsetMs)
    window.setTimeout(() => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // ignore
      }
    }, stopAfter + 30)

    return { ok: true, durationMs }
  }

  async function playMp3OnceUrl(url: string, opts?: { durationMs?: number; offsetMs?: number; volume?: number }): Promise<
    PlayResult
  > {
    const res = await ensureUnlocked()
    if (!res.ok) return res
    return playMp3Once(url, opts)
  }

  function playTonePattern(pattern: TonePattern, opts?: { offsetMs?: number; gain?: number }): PlayResult {
    if (!audioCtx || !masterGain) return { ok: false, reason: 'Audio not initialized' }
    const offsetSec = (opts?.offsetMs ?? 0) / 1000
    const startAt = audioCtx.currentTime + 0.02 + offsetSec
    masterGain.gain.value = opts?.gain ?? 0.9
    const durationMs = scheduleTonePattern(pattern, startAt)
    return { ok: true, durationMs }
  }

  async function playFragment(fragmentId: string, opts?: { offsetMs?: number }): Promise<PlayResult> {
    const res = await ensureUnlocked()
    if (!res.ok) return res

    const trackUrl = getFragmentById(fragmentId)?.trackAudioUrl
    if (!trackUrl) {
      const pattern = makeFragmentPattern(fragmentId)
      return playTonePattern(pattern, opts)
    }

    return playMp3Once(trackUrl, { durationMs: FRAGMENT_DURATION_MS, offsetMs: opts?.offsetMs })
  }

  async function playNote(noteId: string, opts?: { offsetMs?: number }): Promise<PlayResult> {
    const res = await ensureUnlocked()
    if (!res.ok) return res

    const trackUrl = getFragmentById(noteId)?.trackAudioUrl
    if (!trackUrl) {
      const pattern = makeNotePattern(noteId)
      return playTonePattern(pattern, opts)
    }

    return playMp3Once(trackUrl, { durationMs: NOTE_MAX_DURATION_MS, offsetMs: opts?.offsetMs })
  }

  async function playReminder(index: number, opts?: { offsetMs?: number }): Promise<PlayResult> {
    const res = await ensureUnlocked()
    if (!res.ok) return res

    if (REMINDER_AUDIO_URL) {
      return playMp3Once(REMINDER_AUDIO_URL, { durationMs: REMINDER_DURATION_MS, offsetMs: opts?.offsetMs })
    }

    const pattern = makeReminderPattern(index)
    return playTonePattern(pattern, { offsetMs: opts?.offsetMs })
  }

  async function playRecordByNoteIds(noteIds: string[], opts?: { offsetMs?: number }): Promise<PlayResult> {
    const res = await ensureUnlocked()
    if (!res.ok) return res
    if (!audioCtx) return { ok: false, reason: 'Audio not initialized' }

    const offsetSec = (opts?.offsetMs ?? 0) / 1000
    const startAt = audioCtx.currentTime + 0.02 + offsetSec
    const pattern = makeRecordPattern('temp', noteIds)
    const durationMs = scheduleRecord(pattern, startAt, 30_000)
    return { ok: true, durationMs }
  }

  async function warmup(): Promise<void> {
    await ensureUnlocked()
    if (!audioCtx) return
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.03)
  }

  return {
    warmup,
    ensureUnlocked,
    playMp3OnceUrl,
    playFragment,
    playNote,
    playReminder,
    playRecordByNoteIds,
  }
}

