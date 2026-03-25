function interleave(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]!
  const ch0 = channels[0]!
  const ch1 = channels[1]!
  const len = ch0.length
  const out = new Float32Array(len * 2)
  for (let i = 0; i < len; i++) {
    out[i * 2] = ch0[i] ?? 0
    out[i * 2 + 1] = ch1[i] ?? 0
  }
  return out
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

/** 將 AudioBuffer 寫成 WAV（PCM 16-bit LE） */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const chans: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) chans.push(buffer.getChannelData(c))
  const interleaved = interleave(chans)
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = interleaved.length * bytesPerSample
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  floatTo16BitPCM(view, 44, interleaved)

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
