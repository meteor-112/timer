export type FragmentType = {
  id: string;
  label: string;
  color: string;
  baseFrequencyHz: number;
  // 使用同一個 mp3 檔來代表「碎片」與「音軌」；碎片會截到前 5 秒播放
  trackAudioUrl: string;
};

export const FOCUS_INTERVAL_MINUTES = 25; // 每一階段專注的基本單位

export const REMINDER_DURATION_MS = 3_000; // 提醒音效播放長度 (3秒)
export const FRAGMENT_DURATION_MS = 5_000; // 碎片預覽播放長度 (5秒)
export const NOTE_MAX_DURATION_MS = 30_000; // 最終音軌合成後的預計總長度 (30秒)

/** 提醒音檔：專注達成（例如滿 25 分鐘）時播放 */
export const REMINDER_AUDIO_URL = '/audio/reminder.mp3';

/** * 聲音素材庫 (Catalog)
 * 定義了所有可選的聲音類型及其物理屬性
 */
export const FRAGMENT_TYPES: FragmentType[] = [
  { id: 'bird', label: 'bird', color: '#A2CD5A', baseFrequencyHz: 220, trackAudioUrl: '/audio/tracks/birds.mp3' },
  { id: 'guitar1', label: 'guitar1', color: '#CD853F', baseFrequencyHz: 247, trackAudioUrl: '/audio/tracks/guitar-1.mp3' },
  { id: 'piano1', label: 'piano1', color: '#1A1A1A', baseFrequencyHz: 196, trackAudioUrl: '/audio/tracks/piano-1.mp3' },
  { id: 'rain', label: 'rain', color: '#708090', baseFrequencyHz: 262, trackAudioUrl: '/audio/tracks/rain.mp3' },
  { id: 'violin1', label: 'violin1', color: '#A52A2A', baseFrequencyHz: 294, trackAudioUrl: '/audio/tracks/violin-1.mp3' },
  { id: 'wave', label: 'wave', color: '#0077BE', baseFrequencyHz: 330, trackAudioUrl: '/audio/tracks/wave.mp3' },
  { id: 'typing', label: 'typing', color: '#36454F', baseFrequencyHz: 294, trackAudioUrl: '/audio/tracks/typing.mp3' },
  { id: 'seagull', label: 'seagull', color: '#87CEEB', baseFrequencyHz: 330, trackAudioUrl: '/audio/tracks/seagull.mp3' },
  { id: 'owl', label: 'owl', color: '#4B3621', baseFrequencyHz: 165, trackAudioUrl: '/audio/tracks/owl.mp3' },
  { id: 'cricket', label: 'cricket', color: '#4F7942', baseFrequencyHz: 493, trackAudioUrl: '/audio/tracks/cricket.mp3' },
  { id: 'flow', label: 'flow', color: '#5F9EA0', baseFrequencyHz: 220, trackAudioUrl: '/audio/tracks/flow.mp3' },
  { id: 'wind', label: 'wind', color: '#BCC6CC', baseFrequencyHz: 196, trackAudioUrl: '/audio/tracks/wind.mp3' },
  {
    id: 'singingbowl',
    label: 'singingbowl',
    color: '#D4AF37',
    baseFrequencyHz: 440,
    trackAudioUrl: '/audio/tracks/singing-bowl.mp3',
  },
  { id: 'cello', label: 'cello', color: '#5C4033', baseFrequencyHz: 146, trackAudioUrl: '/audio/tracks/cello.mp3' },
  {
    id: 'windchime',
    label: 'windchime',
    color: '#7FFFD4',
    baseFrequencyHz: 500,
    trackAudioUrl: '/audio/tracks/wind-chime.mp3',
  },
  { id: 'bubble', label: 'bubble', color: '#008080', baseFrequencyHz: 330, trackAudioUrl: '/audio/tracks/bubble.mp3' },
  { id: 'thunder', label: 'thunder', color: '#FFD700', baseFrequencyHz: 130, trackAudioUrl: '/audio/tracks/thunder.mp3' },
  {
    id: 'campfire',
    label: 'campfire',
    color: '#E25822',
    baseFrequencyHz: 174,
    trackAudioUrl: '/audio/tracks/campfire.mp3',
  },
];

/** 透過 ID 檢索特定的聲音配置 */
export function getFragmentById(id: string): FragmentType | undefined {
  return FRAGMENT_TYPES.find((f) => f.id === id);
}

// --- Web Audio 合成音效邏輯 ---

/** 單個音符的屬性 */
export type ToneStep = {
  freqHz: number;
  durationMs: number;
  detuneCents?: number;
};
/** 旋律模式：定義一串音符如何組成一段短旋律 */
export type TonePattern = {
  // 以 frequency + 短段 duration 來排程（fallback：找不到 mp3 時使用）
  steps: ToneStep[];
  wave?: OscillatorType;
  peakGain?: number;
};

export function makeFragmentPattern(fragmentId: string): TonePattern {
  const frag = getFragmentById(fragmentId);
  const base = frag?.baseFrequencyHz ?? 220;
  return {
    wave: 'triangle',
    peakGain: 0.22,
    steps: [
      { freqHz: base * 1.0, durationMs: 140 },
      { freqHz: base * 1.25, durationMs: 120 },
      { freqHz: base * 1.5, durationMs: 170 },
      { freqHz: base * 0.95, durationMs: 120 },
    ],
  };
}

export function makeNotePattern(noteId: string): TonePattern {
  const frag = getFragmentById(noteId);
  const base = frag?.baseFrequencyHz ?? 220;
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
  };
}

export function makeReminderPattern(index: number): TonePattern {
  const base = 440;
  const freq = base * (index % 2 === 0 ? 1 : 1.12246);
  return {
    wave: 'sine',
    peakGain: 0.16,
    steps: [
      { freqHz: freq, durationMs: 140 },
      { freqHz: freq * 1.25, durationMs: 90 },
      { freqHz: freq * 0.9, durationMs: 120 },
    ],
  };
}

// --- 錄製/作品配置 ---

/** 定義使用者最後收集碎片後生成的「樂譜」 */
export type RecordPattern = {
  recordId: string;
  noteIds: string[];
  // 每拍的音長與步數，決定總長度是否接近 30 秒（fallback）
  stepDurationMs: number;
  wave?: OscillatorType;
};
/** 建立一份樂譜模式 */
export function makeRecordPattern(recordId: string, noteIds: string[]): RecordPattern {
  const stepDurationMs = 260;
  return { recordId, noteIds, stepDurationMs, wave: 'sine' };
}
