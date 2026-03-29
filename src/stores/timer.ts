// 計時功能(特效與獎勵提供)
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { FOCUS_INTERVAL_MINUTES } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';
import { useAudioEngine } from '@/composables/useAudioEngine';

// --- 型別與常數定義 ---
type TimerMode = 'up' | 'down'; // up: 正數計時, down: 倒數計時
type TimerStatus = 'idle' | 'running' | 'paused' | 'ended'; // 計時器狀態

// 週期長度（毫秒），通常為 25 分鐘
const INTERVAL_MS = FOCUS_INTERVAL_MINUTES * 60 * 1000;
// UI 更新頻率：每 250ms 更新一次，確保秒數跳動視覺流暢
const TICK_MS = 250;

/**
 * 數值限制輔助函式
 */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const useTimerStore = defineStore('timer', () => {
  // --- 響應式狀態 (State) ---
  const mode = ref<TimerMode>('up');
  const status = ref<TimerStatus>('idle');

  const totalDurationMs = ref<number | null>(null); // 目標總時長 (僅倒數模式)
  const startedAtMs = ref<number | null>(null); // 本次開始/恢復計時的時間點
  const elapsedBeforeMs = ref(0); // 累計已過去的時間 (排除當前執行段)
  const segmentIndex = ref(0); // 已觸發了第幾個 25 分片段（0 表示尚未觸發）

  // 當前會話獲取的獎勵列表（用於結算畫面）
  const sessionRewards = ref<Array<{ fragmentId: string; unlocked: boolean; collectedAt: number }>>([]);

  // 當前系統時間快照，由 Ticker 持續更新，帶動所有 Computed 計算
  const tickNowMs = ref(Date.now());

  let intervalHandle: number | null = null;
  let backgroundTimeoutHandle: number | null = null;

  // --- 計算屬性 (Getters) ---

  /**
   * 核心計算：當前總共流逝的毫秒數
   * 邏輯：之前的累積時間 + (現在時間 - 本段開始時間)
   */
  const elapsedMs = computed(() => {
    if (startedAtMs.value != null) {
      return elapsedBeforeMs.value + (tickNowMs.value - startedAtMs.value);
    }
    return elapsedBeforeMs.value;
  });

  /**
   * 倒數模式下的剩餘時間
   */
  const remainingMs = computed(() => {
    if (mode.value !== 'down' || totalDurationMs.value == null) return 0;
    return clamp(totalDurationMs.value - elapsedMs.value, 0, totalDurationMs.value);
  });

  /**
   * 週期進度 (0 到 1 之間)
   * 用於環狀進度條或 GSAP 動畫同步，呈現目前在 25 分鐘內的百分比
   */
  const cycleProgress01 = computed(() => {
    const e = elapsedMs.value;
    return (((e % INTERVAL_MS) + INTERVAL_MS) % INTERVAL_MS) / INTERVAL_MS;
  });

  /**
   * 距離下一個「里程碑 (25 min)」還剩多少時間
   */
  const nextMilestoneInMs = computed(() => {
    if (status.value !== 'running') return null;
    const nextElapsedAt = (segmentIndex.value + 1) * INTERVAL_MS;
    return Math.max(0, nextElapsedAt - elapsedMs.value);
  });

  const triggeredCount = computed(() => segmentIndex.value);

  // --- 內部輔助操作 ---

  function clearTicker() {
    if (intervalHandle != null) {
      window.clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }
  function stopBackgroundPlayback() {
    if (backgroundTimeoutHandle != null) {
      window.clearTimeout(backgroundTimeoutHandle);
      backgroundTimeoutHandle = null;
    }
  }

  /**
   * 觸發里程碑獎勵
   * 包含播放提示音與獲取隨機音訊碎片
   */
  async function triggerMilestone(milestoneIdx: number) {
    // 25 分鐘提醒 + 隨機音碎片
    const audio = useAudioEngine();
    const fragments = useFragmentsStore();
    await audio.playReminder(milestoneIdx); //播放 25 分鐘提醒音
    const res = await fragments.collectRandomFragment(); //靜默獲取隨機碎片
    sessionRewards.value.push({ ...res, collectedAt: Date.now() }); //紀錄到 session，供結算 Modal 顯示
  }

  /**
   * 啟動計時迴圈
   */
  function startTicker() {
    clearTicker();
    tickNowMs.value = Date.now();
    intervalHandle = window.setInterval(() => {
      tickNowMs.value = Date.now();

      const elapsed = elapsedMs.value;

      // 里程碑補齊判斷：若因背景運行導致時間跳躍，會自動補足應得的里程碑
      const elapsedForMilestone = elapsed;
      const maxSegments =
        mode.value === 'down' && totalDurationMs.value != null
          ? Math.floor(totalDurationMs.value / INTERVAL_MS)
          : Number.MAX_SAFE_INTEGER;
      const desiredSegmentIndex = clamp(Math.floor(elapsedForMilestone / INTERVAL_MS), 0, maxSegments);

      // 檢查是否進入新的週期
      while (segmentIndex.value < desiredSegmentIndex) {
        const milestoneIdx = segmentIndex.value;
        segmentIndex.value++;
        // 異步觸發，不阻塞主計時迴圈
        void triggerMilestone(milestoneIdx).catch(() => {
          // ignore audio failures
        });
      }

      // 倒數結束判定
      if (mode.value === 'down' && totalDurationMs.value != null && elapsed >= totalDurationMs.value) {
        status.value = 'ended';
        clearTicker();
        // 結束時若累積超過一個週期，播放最後提示音
        if (elapsed >= INTERVAL_MS) {
          const audio = useAudioEngine();
          void audio.playReminder(segmentIndex.value).catch(() => {
            // ignore
          });
        }
      }
    }, TICK_MS);
  }

  // --- 公開操作 (Actions) ---

  /** 啟動正數計時模式 */
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
  /** 啟動倒數計時模式 */
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
