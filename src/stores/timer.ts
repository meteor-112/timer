import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { FOCUS_INTERVAL_MINUTES } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useBackgroundStore } from '@/stores/background';
import { useMusicStore } from '@/stores/music';

type TimerMode = 'up' | 'down';
type TimerStatus = 'idle' | 'running' | 'paused' | 'ended';

const INTERVAL_MS = FOCUS_INTERVAL_MINUTES * 60 * 1000;
const TICK_MS = 250;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const useTimerStore = defineStore('timer', () => {
  const mode = ref<TimerMode>('up');
  const status = ref<TimerStatus>('idle');

  const totalDurationMs = ref<number | null>(null);
  const startedAtMs = ref<number | null>(null);
  const elapsedBeforeMs = ref(0);
  const segmentIndex = ref(0); // 已觸發了第幾個 25 分片段（0 表示尚未觸發）
  const sessionRewards = ref<Array<{ fragmentId: string; unlocked: boolean; collectedAt: number }>>([]);

  const tickNowMs = ref(Date.now());

  let intervalHandle: number | null = null;
  let backgroundTimeoutHandle: number | null = null;

  function stopBackgroundPlayback() {
    if (backgroundTimeoutHandle != null) {
      window.clearTimeout(backgroundTimeoutHandle);
      backgroundTimeoutHandle = null;
    }
  }

  const elapsedMs = computed(() => {
    if (status.value === 'running' && startedAtMs.value != null) {
      return elapsedBeforeMs.value + (tickNowMs.value - startedAtMs.value);
    }
    return elapsedBeforeMs.value;
  });

  const remainingMs = computed(() => {
    if (mode.value !== 'down' || totalDurationMs.value == null) return 0;
    return clamp(totalDurationMs.value - elapsedMs.value, 0, totalDurationMs.value);
  });

  const cycleProgress01 = computed(() => {
    const e = elapsedMs.value;
    return (((e % INTERVAL_MS) + INTERVAL_MS) % INTERVAL_MS) / INTERVAL_MS;
  });

  const nextMilestoneInMs = computed(() => {
    if (status.value !== 'running') return null;
    const nextElapsedAt = (segmentIndex.value + 1) * INTERVAL_MS;
    return Math.max(0, nextElapsedAt - elapsedMs.value);
  });

  const triggeredCount = computed(() => segmentIndex.value);

  function clearTicker() {
    if (intervalHandle != null) {
      window.clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }

  async function triggerMilestone(milestoneIdx: number) {
    // 25 分鐘提醒 + 隨機音碎片
    const audio = useAudioEngine();
    const fragments = useFragmentsStore();
    await audio.playReminder(milestoneIdx);
    const res = await fragments.collectRandomFragment();
    sessionRewards.value.push({ ...res, collectedAt: Date.now() });
  }

  async function startBackgroundPlayback() {
    stopBackgroundPlayback();

    const background = useBackgroundStore();
    const audio = useAudioEngine();
    const music = useMusicStore();

    if (background.state.kind === 'none') return;

    if (background.state.kind === 'note') {
      const res = await audio.playNote(background.state.trackId);
      const durationMs = res.durationMs ?? 1500;
      backgroundTimeoutHandle = window.setTimeout(
        () => {
          if (status.value === 'running') void startBackgroundPlayback();
        },
        Math.max(500, durationMs + 60),
      );
      return;
    }

    if (background.state.kind === 'record') {
      const record = music.getRecordById(background.state.trackId);
      if (!record) return;
      const url = await music.getRecordMp3ObjectUrl(record.id);
      if (url) {
        await audio.playMp3OnceUrl(url, { durationMs: 30_000 });
      } else {
        // 若尚未生成 mp3，先用合成播放
        await audio.playRecordByNoteIds(record.noteIds);
      }
      backgroundTimeoutHandle = window.setTimeout(() => {
        if (status.value === 'running') void startBackgroundPlayback();
      }, 30_000);
    }
  }

  function startTicker() {
    clearTicker();
    tickNowMs.value = Date.now();
    intervalHandle = window.setInterval(() => {
      tickNowMs.value = Date.now();

      const elapsed = elapsedMs.value;

      // milestone 判斷：用「已過幾個週期」來一次補齊（背景切換也不會漏）
      const elapsedForMilestone = elapsed;
      const maxSegments =
        mode.value === 'down' && totalDurationMs.value != null
          ? Math.floor(totalDurationMs.value / INTERVAL_MS)
          : Number.MAX_SAFE_INTEGER;
      const desiredSegmentIndex = clamp(Math.floor(elapsedForMilestone / INTERVAL_MS), 0, maxSegments);

      // 每段只觸發一次
      while (segmentIndex.value < desiredSegmentIndex) {
        const milestoneIdx = segmentIndex.value;
        segmentIndex.value++;
        // 不在 tick loop 內 await，避免卡 UI；milestone 會連續觸發時各自排程
        void triggerMilestone(milestoneIdx).catch(() => {
          // ignore audio failures
        });
      }

      // countdown 結束（放在里程碑觸發之後，確保邊界週期也會產生碎片/提醒）
      if (mode.value === 'down' && totalDurationMs.value != null && elapsed >= totalDurationMs.value) {
        status.value = 'ended';
        clearTicker();
        stopBackgroundPlayback();
        if (elapsed >= INTERVAL_MS) {
          const audio = useAudioEngine();
          void audio.playReminder(segmentIndex.value).catch(() => {
            // ignore
          });
        }
      }
    }, TICK_MS);
  }

  function startUp(): void {
    mode.value = 'up';
    status.value = 'running';
    totalDurationMs.value = null;
    startedAtMs.value = Date.now();
    elapsedBeforeMs.value = 0;
    segmentIndex.value = 0;
    sessionRewards.value = [];
    startTicker();
    void startBackgroundPlayback();
  }

  function startDown(durationMinutes: number): void {
    mode.value = 'down';
    status.value = 'running';
    totalDurationMs.value = Math.max(0, Math.floor(durationMinutes * 60 * 1000));
    startedAtMs.value = Date.now();
    elapsedBeforeMs.value = 0;
    segmentIndex.value = 0;
    sessionRewards.value = [];
    startTicker();
    void startBackgroundPlayback();
  }

  function pause(): void {
    if (status.value !== 'running') return;
    elapsedBeforeMs.value = elapsedMs.value;
    startedAtMs.value = null;
    status.value = 'paused';
    clearTicker();
    stopBackgroundPlayback();
  }

  function resume(): void {
    if (status.value !== 'paused') return;
    status.value = 'running';
    startedAtMs.value = Date.now();
    startTicker();
    void startBackgroundPlayback();
  }

  function stop(): void {
    status.value = 'idle';
    totalDurationMs.value = null;
    startedAtMs.value = null;
    elapsedBeforeMs.value = 0;
    segmentIndex.value = 0;
    sessionRewards.value = [];
    clearTicker();
    stopBackgroundPlayback();
  }

  function formatDuration(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    // 如果有小時，則在前面加上 hh:
    return h > 0 ? `${String(h).padStart(2, '0')}:${mmss}` : mmss;
  }

  /**
   * 計算顯示用的時間字串
   * 修正：當 idle 且為倒計時模式時，顯示預設的目標時間
   */
  const displayTime = computed(() => {
    // 處理 Idle 狀態下的預覽
    if (status.value === 'idle') {
      if (mode.value === 'down' && totalDurationMs.value != null) {
        return formatDuration(totalDurationMs.value);
      }
      return '00:00';
    }
    // 運行中或暫停中
    if (mode.value === 'down') {
      return formatDuration(remainingMs.value);
    }
    return formatDuration(elapsedMs.value);
  });

  return {
    mode,
    status,
    totalDurationMs,
    segmentIndex,
    triggeredCount,
    tickNowMs,
    elapsedMs,
    remainingMs,
    cycleProgress01,
    nextMilestoneInMs,
    displayTime,
    sessionRewards,
    startUp,
    startDown,
    pause,
    resume,
    stop,
    restartBackground: () => void startBackgroundPlayback(),
    formatDuration,
  };
});
