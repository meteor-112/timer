<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import WaveBall from '@/components/WaveBall.vue';
import { useTimerStore } from '@/stores/timer';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useFragmentsStore } from '@/stores/fragments';
import { useMusicStore } from '@/stores/music';
import { useBackgroundStore } from '@/stores/background';
import { ChevronDown, ChevronUp, Play, Pause, RotateCcw } from 'lucide-vue-next';
import { FOCUS_INTERVAL_MINUTES, getFragmentById } from '@/data/audioCatalog';

const timer = useTimerStore();
const downMinutes = ref(25);
const audio = useAudioEngine();
const fragments = useFragmentsStore();
const music = useMusicStore();
const background = useBackgroundStore();

// --- Modal 相關狀態 ---
const showCompletionModal = ref(false);
const completionStep = ref(0);
const completionMinutes = ref(0);
interface CompletionItem {
  kind: 'fragment' | 'unlock';
  fragmentId: string;
}
const completionItems = ref<CompletionItem[]>([]);
const lastPlayedStep = ref(-1);
const currentCompletionItem = computed(() => completionItems.value[completionStep.value - 1] ?? null);

// 計算當前是否允許切換模式（只有在 idle 狀態下才允許）
const canSwitchMode = computed(() => timer.status === 'idle');

/**
 * 關閉或進入下一個 Modal 步驟
 */
function nextCompletionStep() {
  const hasMore = completionStep.value < completionItems.value.length;
  if (completionStep.value === 0 && !hasMore) {
    showCompletionModal.value = false;
    completionStep.value = 0;
    timer.stop();
    return;
  }

  if (hasMore) completionStep.value++;
  else {
    showCompletionModal.value = false;
    completionStep.value = 0;
    timer.stop();
  }
}

/**
 * 偵測計時器狀態，若結束且超過門檻則顯示 Modal
 */
watch(
  () => timer.status,
  (newStatus) => {
    if (newStatus === 'ended') {
      const minutes = Math.floor(timer.elapsedMs / (60 * 1000));
      if (minutes < FOCUS_INTERVAL_MINUTES) return;

      completionMinutes.value = minutes;

      const rewards = timer.sessionRewards ?? [];
      const fragmentItems = rewards.map((r) => ({ kind: 'fragment' as const, fragmentId: r.fragmentId }));
      const unlockIds = Array.from(new Set(rewards.filter((r) => r.unlocked).map((r) => r.fragmentId)));
      const unlockItems = unlockIds.map((id) => ({ kind: 'unlock' as const, fragmentId: id }));

      completionItems.value = [...fragmentItems, ...unlockItems];
      completionStep.value = 0;
      lastPlayedStep.value = -1;
      showCompletionModal.value = true;
    }
  },
);

watch(
  () => [showCompletionModal.value, completionStep.value],
  async () => {
    if (!showCompletionModal.value) return;
    if (completionStep.value <= 0) return;
    if (lastPlayedStep.value === completionStep.value) return;

    const item = completionItems.value[completionStep.value - 1];
    if (!item) return;

    lastPlayedStep.value = completionStep.value;

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

function handleResetToInitial() {
  timer.stop();
  if (timer.mode === 'down') {
    timer.totalDurationMs = downMinutes.value * 60 * 1000;
  }
}

onMounted(() => {
  switchMode('down');
});

const backgroundValue = computed({
  get() {
    if (background.state.kind === 'none') return 'none';
    if (background.state.kind === 'note') return `note:${background.state.trackId}`;
    return `record:${background.state.trackId}`;
  },
  set(v: string) {
    if (v === 'none') background.setNone();
    else {
      const [kind, id] = v.split(':');
      if (kind === 'note' && id) background.setNoteBackground(id);
      if (kind === 'record' && id) background.setRecordBackground(id);
    }
  },
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
    <div class="flex gap-2">
      <button
        @click="switchMode('down')"
        :disabled="!canSwitchMode"
        aria-label="切換至倒計時模式"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          timer.mode === 'down' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
          !canSwitchMode ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/80',
        ]"
      >
        倒計時
      </button>
      <button
        @click="switchMode('up')"
        :disabled="!canSwitchMode"
        aria-label="切換至正計時模式"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          timer.mode === 'up' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
          !canSwitchMode ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/80',
        ]"
      >
        正計時
      </button>
    </div>

    <div
      class="flex items-center gap-3 transition-opacity duration-300"
      :class="{ 'invisible opacity-0': timer.mode !== 'down' }"
    >
      <button
        class="glass-panel rounded-full p-1 transition-transform hover:scale-110 disabled:opacity-30"
        @click="downMinutes = Math.max(5, downMinutes - 5)"
        :disabled="timer.status !== 'idle'"
        aria-label="減少五分鐘"
      >
        <ChevronDown class="h-4 w-4" />
      </button>
      <span class="text-muted-foreground text-sm font-medium" aria-live="polite">{{ downMinutes }}分鐘</span>
      <button
        class="glass-panel rounded-full p-1 transition-transform hover:scale-110 disabled:opacity-30"
        @click="downMinutes = Math.min(120, downMinutes + 5)"
        :disabled="timer.status !== 'idle'"
        aria-label="增加五分鐘"
      >
        <ChevronUp class="h-4 w-4" />
      </button>
    </div>

    <WaveBall :is-running="timer.status === 'running'" />

    <div class="font-display text-foreground text-5xl font-light tracking-widest" aria-live="numeric">
      {{ timer.displayTime }}
    </div>

    <div class="flex items-center gap-4">
      <button
        v-if="timer.status !== 'running'"
        @click="
          timer.status === 'paused' ? handleResume() : timer.mode === 'down' ? warmAndStartDown() : warmAndStartUp()
        "
        class="glass-panel-primary flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
        :aria-label="timer.status === 'paused' ? '繼續計時' : '開始計時'"
      >
        <Play class="text-foreground ml-0.5 h-6 w-6" />
      </button>
      <button
        v-else
        @click="timer.pause()"
        class="glass-panel-primary flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
        aria-label="暫停計時"
      >
        <Pause class="text-foreground h-6 w-6" />
      </button>
      <button
        v-if="timer.status !== 'idle'"
        @click="handleResetToInitial"
        class="glass-panel flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
        aria-label="重置計時器"
      >
        <RotateCcw class="text-muted-foreground h-4 w-4" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showCompletionModal"
        class="bg-foreground/20 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        @click="nextCompletionStep"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="glass-panel animate-scale-in mx-4 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"
          @click.stop
        >
          <div v-if="completionStep === 0">
            <h2 class="mb-2 text-xl font-semibold">恭喜！</h2>
            <p class="text-muted-foreground mb-5">您已專注 {{ completionMinutes }} 分鐘！</p>
            <button @click="nextCompletionStep" class="glass-panel-primary rounded-full px-6 py-2 text-sm font-medium">
              {{ completionItems.length ? '繼續' : '關閉' }}
            </button>
          </div>
          <div v-else>
            <template v-if="currentCompletionItem">
              <template v-if="currentCompletionItem.kind === 'fragment'">
                <div class="mb-2 text-sm font-medium text-slate-500/80">獲得碎片</div>
                <div class="text-foreground mb-5 text-2xl font-semibold">
                  {{ fragments.getFragmentLabel(currentCompletionItem.fragmentId) }}
                </div>
              </template>
              <template v-else>
                <div class="mb-2 text-sm font-medium text-slate-500/80">解鎖成功</div>
                <div class="text-foreground mb-1 text-2xl font-semibold">
                  已解鎖「{{ fragments.getFragmentLabel(currentCompletionItem.fragmentId) }}」唱片
                </div>
                <div class="text-muted-foreground mb-5 text-sm">完整音軌已可播放</div>
              </template>
              <button
                @click="nextCompletionStep"
                class="glass-panel-primary rounded-full px-6 py-2 text-sm font-medium"
              >
                {{ completionStep < completionItems.length ? '繼續' : '關閉' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
