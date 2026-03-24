<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import WaveBall from '@/components/WaveBall.vue';
import { useTimerStore } from '@/stores/timer';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useFragmentsStore } from '@/stores/fragments';
import { useMusicStore } from '@/stores/music';
import { useBackgroundStore } from '@/stores/background';
import { ChevronDown, ChevronUp, Play, Pause, RotateCcw } from 'lucide-vue-next';

const timer = useTimerStore();
const downMinutes = ref(25);
const audio = useAudioEngine();
const fragments = useFragmentsStore();
const music = useMusicStore();
const background = useBackgroundStore();

// --- Modal 相關狀態 ---
const showCompletionModal = ref(false);
const completion = ref({
  step: 0,
  duration: 0,
  fragments: [] as any[],
});

/**
 * 關閉或進入下一個 Modal 步驟
 */
function nextCompletionStep() {
  if (completion.value.step < completion.value.fragments.length) {
    completion.value.step++;
  } else {
    showCompletionModal.value = false;
    completion.value.step = 0;
    timer.stop(); // 流程完全結束後回到 idle
  }
}

/**
 * 偵測計時器狀態，若結束且超過 25 分鐘則顯示 Modal
 */
watch(
  () => timer.status,
  (newStatus) => {
    if (newStatus === 'ended') {
      const durationSec = Math.floor(timer.elapsedMs / 1000);

      // 條件：計時結束且累積超過 25 分鐘 (1500秒)
      if (durationSec >= 300) {
        completion.value.duration = durationSec;
        // 假設從 fragmentsStore 獲取本次獲得的碎片（這裡模擬數據，你可根據實際邏輯調整）
        completion.value.fragments = fragments.lastObtainedFragments || [];
        completion.value.step = 0;
        showCompletionModal.value = true;
      }
    }
  },
);

/**
 * 切換模式並重置
 */
function switchMode(newMode: 'up' | 'down') {
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
  () => [background.selectedKind, background.selectedTrackId, timer.status],
  () => {
    if (timer.status === 'running') timer.restartBackground();
  },
);

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
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          timer.mode === 'down' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
        ]"
      >
        倒計時
      </button>
      <button
        @click="switchMode('up')"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          timer.mode === 'up' ? 'bg-white shadow-sm' : 'bg-gray-300 opacity-60',
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
        @click="downMinutes = Math.max(25, downMinutes - 5)"
        :disabled="timer.status !== 'idle'"
      >
        <ChevronDown class="h-4 w-4" />
      </button>
      <span class="text-muted-foreground text-sm font-medium">{{ downMinutes }}分鐘</span>
      <button
        class="glass-panel rounded-full p-1 transition-transform hover:scale-110 disabled:opacity-30"
        @click="downMinutes = Math.min(120, downMinutes + 5)"
        :disabled="timer.status !== 'idle'"
      >
        <ChevronUp class="h-4 w-4" />
      </button>
    </div>

    <WaveBall :is-running="timer.status === 'running'" />

    <div class="font-display text-foreground text-5xl font-light tracking-widest">{{ timer.displayTime }}</div>

    <div class="flex items-center gap-4">
      <button
        v-if="timer.status !== 'running'"
        @click="
          timer.status === 'paused' ? handleResume() : timer.mode === 'down' ? warmAndStartDown() : warmAndStartUp()
        "
        class="glass-panel-primary flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        <Play class="text-foreground ml-0.5 h-6 w-6" />
      </button>
      <button
        v-else
        @click="timer.pause()"
        class="glass-panel-primary flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        <Pause class="text-foreground h-6 w-6" />
      </button>
      <button
        v-if="timer.status !== 'idle'"
        @click="handleResetToInitial"
        class="glass-panel flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        <RotateCcw class="text-muted-foreground h-4 w-4" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showCompletionModal"
        class="bg-foreground/20 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        @click="nextCompletionStep"
      >
        <div
          class="glass-panel animate-scale-in mx-4 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"
          @click.stop
        >
          <div v-if="completion.step === 0">
            <div class="mb-4 text-4xl">🎉</div>
            <h2 class="mb-2 text-xl font-semibold">恭喜完成專注！</h2>
            <p class="text-muted-foreground mb-4">
              你專注了 {{ Math.floor(completion.duration / 60) }} 分 {{ completion.duration % 60 }} 秒
            </p>
            <button @click="nextCompletionStep" class="glass-panel-primary rounded-full px-6 py-2 text-sm font-medium">
              查看獲得的碎片
            </button>
          </div>

          <div v-else>
            <template v-if="completion.fragments[completion.step - 1]">
              <div class="animate-float mb-4 text-5xl">
                {{ completion.fragments[completion.step - 1].icon }}
              </div>
              <h3 class="mb-1 text-lg font-semibold">
                {{ completion.fragments[completion.step - 1].isNew ? '🆕 初次獲得！' : '' }}
              </h3>
              <p class="mb-2 text-xl font-medium">{{ completion.fragments[completion.step - 1].name }}</p>

              <div
                v-if="completion.fragments[completion.step - 1].justUnlocked"
                class="glass-panel-accent animate-fade-in mb-4 rounded-xl px-4 py-3"
              >
                <p class="text-sm font-semibold">🎵 音軌已解鎖！</p>
                <p class="text-muted-foreground text-xs">集齊 4 個碎片，完整音軌已可播放</p>
              </div>

              <button
                @click="nextCompletionStep"
                class="glass-panel-primary rounded-full px-6 py-2 text-sm font-medium"
              >
                {{ completion.step < completion.fragments.length ? '下一個' : '完成' }}
              </button>
            </template>

            <template v-else>
              <p class="text-muted-foreground mb-4">沒有更多碎片了</p>
              <button
                @click="nextCompletionStep"
                class="glass-panel-primary rounded-full px-6 py-2 text-sm font-medium"
              >
                完成
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
