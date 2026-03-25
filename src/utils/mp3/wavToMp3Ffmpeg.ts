import { FFmpeg } from '@ffmpeg/ffmpeg'
import coreURL from '../../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url'
import wasmURL from '../../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url'

let ffmpegPromise: Promise<FFmpeg> | null = null

async function getFfmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({ coreURL, wasmURL })
      return ffmpeg
    })()
  }
  return ffmpegPromise
}

/** WAV Blob → MP3（libmp3lame），需載入 ffmpeg wasm */
export async function wavBlobToMp3Blob(wav: Blob, kbps = 128): Promise<Blob> {
  const ffmpeg = await getFfmpeg()
  const wavBytes = new Uint8Array(await wav.arrayBuffer())
  await ffmpeg.writeFile('input.wav', wavBytes)
  await ffmpeg.exec(['-i', 'input.wav', '-codec:a', 'libmp3lame', '-b:a', `${kbps}k`, 'output.mp3'])
  const data = await ffmpeg.readFile('output.mp3')
  if (typeof data === 'string') throw new Error('預期 MP3 為二進位資料')
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return new Blob([copy], { type: 'audio/mpeg' })
}
