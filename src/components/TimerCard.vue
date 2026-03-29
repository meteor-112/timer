<!-- 計時器 -->
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import WaveBall from '@/components/WaveBall.vue';
import ActionIconButton from './ActionIconButton.vue';
import { useTimerStore } from '@/stores/timer';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useFragmentsStore } from '@/stores/fragments';
import { ChevronDown, ChevronUp, Play, Pause, RotateCcw } from 'lucide-vue-next';
import { FOCUS_INTERVAL_MINUTES, getFragmentById } from '@/data/audioCatalog';
import { runTimerCompletionAlerts, type TimerCompletionItem } from '@/composables/useAlert';

const timer = useTimerStore();
const downMinutes = ref(25);
const audio = useAudioEngine();
const fragments = useFragmentsStore();

function buildCompletionItems(
  rewardsSnapshot: Array<{ fragmentId: string; unlocked: boolean }>,
): TimerCompletionItem[] {
  const fragmentItems: TimerCompletionItem[] = rewardsSnapshot.map((r) => ({
    kind: 'fragment',
    fragmentId: r.fragmentId,
  }));
  const unlockIds = Array.from(new Set(rewardsSnapshot.filter((r) => r.unlocked).map((r) => r.fragmentId)));
  const unlockItems: TimerCompletionItem[] = unlockIds.map((id) => ({ kind: 'unlock', fragmentId: id }));
  return [...fragmentItems, ...unlockItems];
}

async function playRewardAudio(item: TimerCompletionItem) {
  if (item.kind === 'fragment') {
    await audio.playFragment(item.fragmentId).catch(() => {});
    return;
  }
  const url = getFragmentById(item.fragmentId)?.trackAudioUrl;
  if (url) {
    await audio.playMp3OnceAutoDuration(url, { offsetMs: 0, volume: 0.95 }).catch(() => {});
  } else {
    await audio.playNote(item.fragmentId, { offsetMs: 60 }).catch(() => {});
  }
}

async function runCompletionUiFlow(minutes: number, rewardsSnapshot: Array<{ fragmentId: string; unlocked: boolean }>) {
  const items = buildCompletionItems(rewardsSnapshot);
  await runTimerCompletionAlerts(minutes, items, {
    getFragmentLabel: fragments.getFragmentLabel,
    beforeEachReward: playRewardAudio,
  });
}

// 計算當前是否允許切換模式（只有在 idle 狀態下才允許）
const canSwitchMode = computed(() => timer.status === 'idle');

/**
 * 偵測計時器狀態，若結束且超過門檻則顯示完成流程
 */
watch(
  () => timer.status,
  async (newStatus) => {
    if (newStatus !== 'ended') return;
    const minutes = Math.floor(timer.elapsedMs / (60 * 1000));
    if (minutes < FOCUS_INTERVAL_MINUTES) return;
    const rewardsSnapshot = (timer.sessionRewards ?? []).map((r) => ({
      fragmentId: r.fragmentId,
      unlocked: r.unlocked,
    }));
    await runCompletionUiFlow(minutes, rewardsSnapshot);
    timer.clearSessionRewards();
    timer.stop();
  },
);

/**
 * 切換模式並重置
 */
function switchMode(newMode: 'up' | 'down') {
  // 防禦性檢查：計時中不可切換
  if (!canSwitchMode.value) return;

  timer.stop();
  timer.mode = newMode;
  if (newMode === 'down') {
    downMinutes.value = 25;
    timer.totalDurationMs = 25 * 60 * 1000;
  } else {
    timer.totalDurationMs = null;
  }
}

async function handleResetToInitial() {
  const minutes = Math.floor(timer.elapsedMs / (60 * 1000));
  const rewardsSnapshot = (timer.sessionRewards ?? []).map((r) => ({ fragmentId: r.fragmentId, unlocked: r.unlocked }));
  if (minutes >= FOCUS_INTERVAL_MINUTES) {
    await runCompletionUiFlow(minutes, rewardsSnapshot);
  }
  timer.clearSessionRewards();
  timer.stop();
  if (timer.mode === 'down') timer.totalDurationMs = downMinutes.value * 60 * 1000;
}

onMounted(() => {
  switchMode('down');
});

watch(
  downMinutes,
  (newMin) => {
    if (timer.status === 'idle' && timer.mode === 'down') {
      timer.totalDurationMs = newMin * 60 * 1000;
    }
  },
  { immediate: true },
);

async function warmAndStartUp() {
  await audio.warmup();
  timer.startUp();
}
async function warmAndStartDown() {
  await audio.warmup();
  timer.startDown(downMinutes.value);
}
async function handleResume() {
  await audio.warmup();
  timer.resume();
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-6">
    <!-- 計時模式切換按鈕 -->
    <div class="flex gap-4">
      <button
        @click="switchMode('down')"
        :disabled="!canSwitchMode"
        aria-label="切換至倒計時模式"
        :class="[
          'rounded-full px-5 py-2 text-lg font-bold transition-all',
          timer.mode === 'down' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
          !canSwitchMode ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-white/80',
        ]"
      >
        倒計時
      </button>
      <button
        @click="switchMode('up')"
        :disabled="!canSwitchMode"
        aria-label="切換至正計時模式"
        :class="[
          'rounded-full px-5 py-2 text-lg font-bold transition-all',
          timer.mode === 'up' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
          !canSwitchMode ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-white/80',
        ]"
      >
        正計時
      </button>
    </div>

    <!-- 倒計時之時長調整 -->
    <div
      class="flex items-center gap-4 transition-opacity duration-300"
      :class="{ 'invisible opacity-0': timer.mode !== 'down' }"
    >
      <ActionIconButton
        :icon="ChevronDown"
        variant="none"
        icon-size="md"
        custom-class="p-2 rounded-full"
        title="減少五分鐘"
        @click="downMinutes = Math.max(5, downMinutes - 5)"
        aria-label="減少五分鐘"
      />
      <span aria-live="polite">{{ downMinutes }} min</span>
      <ActionIconButton
        :icon="ChevronUp"
        variant="none"
        icon-size="md"
        custom-class="p-2 rounded-full"
        title="增加五分鐘"
        @click="downMinutes = Math.min(120, downMinutes + 5)"
        aria-label="增加五分鐘"
      />
    </div>
    <!-- 聲波球動畫 -->
    <WaveBall :is-running="timer.status === 'running'" />
    <!-- 計時時間 -->
    <div class="text-[60px] font-light tracking-widest" aria-live="polite">
      {{ timer.displayTime }}
    </div>
    <!-- 計時器按鈕區 -->
    <div class="flex items-center gap-8">
      <ActionIconButton
        v-if="timer.status !== 'running'"
        :icon="Play"
        variant="none"
        iconSize="xl"
        custom-class="p-3 rounded-full"
        :title="timer.status === 'paused' ? '繼續計時' : '開始計時'"
        :aria-label="timer.status === 'paused' ? '繼續計時' : '開始計時'"
        @click="
          timer.status === 'paused' ? handleResume() : timer.mode === 'down' ? warmAndStartDown() : warmAndStartUp()
        "
      >
        <template #default>
          <span class="sr-only">{{ timer.status === 'paused' ? '繼續' : '開始' }}</span>
        </template>
      </ActionIconButton>

      <ActionIconButton
        v-else
        :icon="Pause"
        variant="none"
        iconSize="xl"
        custom-class="rounded-full p-3"
        title="暫停計時"
        aria-label="暫停計時"
        @click="timer.pause()"
      />
      <ActionIconButton
        v-if="timer.status !== 'idle'"
        :icon="RotateCcw"
        variant="none"
        iconSize="md"
        custom-class="p-3 rounded-full"
        title="重置計時"
        aria-label="重置計時器"
        @click="handleResetToInitial"
      />
    </div>
  </div>
</template>
