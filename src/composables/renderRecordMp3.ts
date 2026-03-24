import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog'
import { audioBufferToMp3Blob } from '@/utils/mp3/audioBufferToMp3'

function getDecodeContext(): AudioContext | null {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  return new Ctx()
}

async function decodeMp3ToAudioBuffer(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  const res = await fetch(url)
  const arr = await res.arrayBuffer()
  const buf = await ctx.decodeAudioData(arr.slice(0))
  return buf
}

export async function renderRecordMp3FromNoteIds(
  noteIds: string[],
  opts?: { durationMs?: number; kbps?: number; volume?: number },
): Promise<Blob> {
  const durationMs = opts?.durationMs ?? 30_000
  const kbps = opts?.kbps ?? 128
  const volume = opts?.volume ?? 0.65

  const safeNoteIds = noteIds.length ? noteIds : FRAGMENT_TYPES.slice(0, 2).map((f) => f.id)
  const decodeCtx = getDecodeContext()
  if (!decodeCtx) throw new Error('AudioContext not supported')

  const decodedBuffers: AudioBuffer[] = []
  for (const id of safeNoteIds) {
    const url = getFragmentById(id)?.trackAudioUrl
    if (!url) continue
    decodedBuffers.push(await decodeMp3ToAudioBuffer(url, decodeCtx))
  }

  if (!decodedBuffers.length) {
    decodeCtx.close()
    throw new Error('Failed to decode note tracks')
  }

  const buffers = decodedBuffers

  const durationSec = durationMs / 1000
  const sampleRate = decodeCtx.sampleRate
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSec))
  const offline = new OfflineAudioContext(2, totalSamples, sampleRate)

  const master = offline.createGain()
  master.gain.value = volume
  master.connect(offline.destination)

  const N = buffers.length
  const segmentLenSec = durationSec / N

  for (let i = 0; i < N; i++) {
    const buffer = buffers[i]!
    const segStartSec = i * segmentLenSec
    const segDurationSec = i === N - 1 ? durationSec - segStartSec : segmentLenSec
    if (segDurationSec <= 0) continue

    const source = offline.createBufferSource()
    source.buffer = buffer
    source.connect(master)

    const maxDur = Math.max(0, buffer.duration)
    const playDur = Math.min(segDurationSec, maxDur)
    if (playDur <= 0) continue

    source.start(segStartSec, 0, playDur)
  }

  const rendered = await offline.startRendering()
  decodeCtx.close()
  return audioBufferToMp3Blob(rendered, kbps)
}

