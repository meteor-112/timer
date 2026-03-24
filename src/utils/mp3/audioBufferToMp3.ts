import lamejs from 'lamejs'

function clampFloatToInt16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample))
  return s < 0 ? s * 0x8000 : s * 0x7fff
}

function float32ToInt16Array(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) out[i] = clampFloatToInt16(input[i] ?? 0)
  return out
}

// 以 AudioBuffer 轉出 mp3 Blob
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 128): Blob {
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate

  const left = float32ToInt16Array(buffer.getChannelData(0))
  const right = channels > 1 ? float32ToInt16Array(buffer.getChannelData(1)) : undefined

  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)
  const blockSize = 1152
  const mp3Data: BlobPart[] = []

  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize)
    if (right) {
      const rightChunk = right.subarray(i, i + blockSize)
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
      if (mp3buf.length > 0) mp3Data.push(mp3buf as unknown as BlobPart)
    } else {
      const mp3buf = mp3encoder.encodeBuffer(leftChunk)
      if (mp3buf.length > 0) mp3Data.push(mp3buf as unknown as BlobPart)
    }
  }

  const endBuf = mp3encoder.flush()
  if (endBuf.length > 0) mp3Data.push(endBuf as unknown as BlobPart)

  return new Blob(mp3Data, { type: 'audio/mpeg' })
}

