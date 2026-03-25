import { Offline, Player, Gain, Buffer as ToneBuffer } from 'tone'
import { getFragmentById } from '@/data/audioCatalog'
import { audioBufferToWavBlob } from '@/utils/audio/audioBufferToWav'
import { wavBlobToMp3Blob } from '@/utils/mp3/wavToMp3Ffmpeg'

export type MixTrack = {
  noteId: string
  /** 在 30 秒時間軸上的起始位置（秒） */
  offsetSec: number
  /** 線性音量 0–1 */
  volume: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * 以 Tone.js 離線混音，再經 ffmpeg 轉成 MP3。
 * 最多使用 5 條音軌。
 */
export async function renderRecordMp3FromMix(
  tracks: MixTrack[],
  opts?: { durationMs?: number; kbps?: number; masterGain?: number },
): Promise<Blob> {
  const durationMs = opts?.durationMs ?? 30_000
  const kbps = opts?.kbps ?? 128
  const masterGain = opts?.masterGain ?? 0.85
  const durationSec = durationMs / 1000

  const limited = tracks
    .filter((t) => getFragmentById(t.noteId)?.trackAudioUrl)
    .slice(0, 5)

  if (!limited.length) {
    throw new Error('沒有可用的音軌')
  }

  const toneBuffer = await Offline(async () => {
    const master = new Gain(masterGain).toDestination()

    for (const t of limited) {
      const url = getFragmentById(t.noteId)?.trackAudioUrl
      if (!url) continue

      const buf = await ToneBuffer.fromUrl(url)
      const vol = clamp(t.volume, 0, 1)
      const gain = new Gain(vol)
      const player = new Player(buf)
      player.chain(gain, master)

      const start = clamp(t.offsetSec, 0, Math.max(0, durationSec - 0.02))
      player.start(start)
    }
  }, durationSec)

  const audioBuf = toneBuffer.get()
  if (!audioBuf) throw new Error('Tone 混音失敗')
  const wavBlob = audioBufferToWavBlob(audioBuf)
  return wavBlobToMp3Blob(wavBlob, kbps)
}

export function legacyMixFromNoteIds(noteIds: string[]): MixTrack[] {
  const ids = noteIds.filter(Boolean).slice(0, 5)
  if (!ids.length) return []
  const n = ids.length
  const seg = 30 / n
  return ids.map((noteId, i) => ({
    noteId,
    offsetSec: seg * i,
    volume: 0.65,
  }))
}
