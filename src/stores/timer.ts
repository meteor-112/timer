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

  // 計算累積時間：只要 startedAtMs 存在，就用 tickNowMs 估算，
  // 讓倒數「ended」狀態也能正確結算（避免 elapsedMs 變 0）。
  const elapsedMs = computed(() => {
    if (startedAtMs.value != null) {
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
    await audio.playReminder(milestoneIdx);//播放 25 分鐘提醒音
    const res = await fragments.collectRandomFragment();//靜默獲取隨機碎片
    sessionRewards.value.push({ ...res, collectedAt: Date.now() });//紀錄到 session，供結算 Modal 顯示
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
  }

  function stop(): void {
    status.value = 'idle';
    totalDurationMs.value = null;
    startedAtMs.value = null;
    elapsedBeforeMs.value = 0;
    segmentIndex.value = 0;
    clearTicker();
    stopBackgroundPlayback();
  }

  function clearSessionRewards(): void {
    sessionRewards.value = [];
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
    clearSessionRewards,
    formatDuration,
  };
});
