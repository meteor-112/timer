<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import PlayStopButton from './PlayStopButton.vue';
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';
import { useMusicStore } from '@/stores/music';
import { useBackgroundStore } from '@/stores/background';

const fragments = useFragmentsStore();
const music = useMusicStore();
const background = useBackgroundStore();

type SelectionKind = 'note' | 'record';

const kind = ref<SelectionKind>('note');
const selectedNoteId = ref<string>('');
const selectedRecordId = ref<string>('');

// 計算已獲取的音效清單
const acquiredNotes = computed(() => FRAGMENT_TYPES.filter((f) => fragments.getCount(f.id) > 0));

// 當前選中的標籤名稱
const selectedLabel = computed((): string => {
  if (kind.value === 'note') {
    return fragments.getFragmentLabel(selectedNoteId.value) || '未選擇音效';
  }
  const rec = music.getRecordById(selectedRecordId.value);
  return rec?.name ?? '未選擇唱片';
});

// 綁定背景播放狀態
const isPlaying = computed({
  get: () => background.isActive,
  set: (val: boolean) => {
    background.isActive = val;
  },
});

let audioEl: HTMLAudioElement | null = null;
let recordLoopHandle: number | null = null;

/**
 * 停止播放並清理資源
 */
function stop(): void {
  isPlaying.value = false;
  if (recordLoopHandle !== null) {
    window.clearTimeout(recordLoopHandle);
    recordLoopHandle = null;
  }
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch (e) {
      console.error('Stop audio error:', e);
    }
    audioEl = null;
  }
}

/**
 * 開始循環播放邏輯
 */
async function startLoop(): Promise<void> {
  stop();

  if (kind.value === 'note') {
    const id = selectedNoteId.value;
    if (!id) return;
    const url = getFragmentById(id)?.trackAudioUrl;
    if (!url) return;

    audioEl = new Audio(url);
    audioEl.loop = true;
    audioEl.volume = 0.95;
    isPlaying.value = true;
    try {
      await audioEl.play();
    } catch {
      stop();
    }
    return;
  }

  const recordId = selectedRecordId.value;
  if (!recordId) return;

  // 優先嘗試使用 MP3 進行循環播放
  const ok = await music.ensureRecordMp3(recordId).catch(() => false);
  if (ok) {
    const url = await music.getRecordMp3ObjectUrl(recordId);
    if (url) {
      audioEl = new Audio(url);
      audioEl.loop = true;
      audioEl.volume = 0.95;
      isPlaying.value = true;
      try {
        await audioEl.play();
      } catch {
        stop();
      }
      return;
    }
  }

  // Fallback：30秒循環播放一次
  isPlaying.value = true;
  const playOnceThenSchedule = async (): Promise<void> => {
    if (!isPlaying.value) return;
    await music.playRecord(recordId).catch(() => {});
    if (!isPlaying.value) return;
    recordLoopHandle = window.setTimeout(() => {
      void playOnceThenSchedule();
    }, 30_000);
  };
  void playOnceThenSchedule();
}

function togglePlay(): void {
  if (isPlaying.value) {
    stop();
  } else {
    void startLoop();
  }
}

// 當切換類型時，強制停止目前的播放
watch(kind, () => stop());

onUnmounted(() => stop());
</script>

<template>
  <div
    class="relative mx-auto w-[340px] rounded-[3rem] border-t border-slate-600 bg-gradient-to-b from-slate-300 to-slate-600 p-5 shadow-2xl ring-[8px] ring-slate-800"
  >
    <div
      class="relative flex aspect-[4/3] w-full flex-col overflow-hidden rounded-xl border-[6px] border-slate-600 bg-gray-200 shadow-inner"
    >
      <div class="absolute inset-0 flex scale-125 items-center justify-center opacity-60">
        <GreenEnergySphere :is-running="isPlaying" :size="280" />
      </div>

      <div class="relative z-20 flex h-full flex-col p-4">
        <div class="mb-2 flex items-center justify-between font-mono text-xs text-stone-700/80">
          <span class="flex items-center gap-1">
            <span v-if="isPlaying" class="h-1.5 w-1.5 animate-ping rounded-full bg-stone-700"></span>
            {{ isPlaying ? 'PLAYING' : 'PAUSED' }}
          </span>
          <span>VOL 85%</span>
        </div>

        <div class="flex flex-1 flex-col items-center justify-center">
          <h2 class="px-2 text-center text-2xl tracking-tight text-black">
            {{ selectedLabel }}
          </h2>
          <div class="mt-2 h-1 w-24 overflow-hidden rounded-full bg-sky-500/30">
            <div
              class="h-full bg-sky-500 transition-all duration-500"
              :style="{ width: isPlaying ? '100%' : '0%' }"
            ></div>
          </div>
        </div>

        <div class="mt-auto border-t border-gray-400/80 pt-2">
          <div class="mb-2 grid grid-cols-2 gap-2">
            <button
              v-for="opt in ['note', 'record'] as const"
              :key="opt"
              @click="kind = opt"
              class="cursor-pointer rounded border px-2 py-0.5 text-sm transition-all"
              :class="kind === opt ? 'border-gray-400 bg-gray-400 text-white' : 'border-gray-500 hover:bg-white/40'"
            >
              {{ opt.toUpperCase() }}
            </button>
          </div>

          <div class="group relative">
            <select
              v-if="kind === 'note'"
              v-model="selectedNoteId"
              @change="stop()"
              class="w-full cursor-pointer appearance-none rounded border border-gray-500 bg-white/30 px-2 py-1 text-sm text-gray-700 outline-none hover:bg-white/60"
            >
              <option value="" disabled>--- CHOOSE EFFECT ---</option>
              <option v-for="f in acquiredNotes" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>

            <select
              v-else
              v-model="selectedRecordId"
              @change="stop()"
              class="w-full cursor-pointer appearance-none rounded border border-gray-500 bg-white/30 px-2 py-1 text-sm text-gray-700 outline-none hover:bg-white/60"
            >
              <option value="" disabled>--- CHOOSE TRACK ---</option>
              <option v-for="r in music.musicRecords" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <ChevronDown class="absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>
    </div>

    <!-- 按鈕 -->
    <div class="mt-8 mb-4 flex justify-center">
      <div
        class="group relative flex h-44 w-44 items-center justify-center rounded-full border border-slate-600 bg-gradient-to-b from-slate-200 to-slate-300 shadow-xl"
      >
        <div class="absolute top-4 text-sm font-bold tracking-widest text-slate-700">MENU</div>

        <PlayStopButton
          :is-playing="isPlaying"
          :size="60"
          class="rounded-full bg-white ring ring-slate-500 active:scale-90"
          :disabled="kind === 'note' ? !selectedNoteId : !selectedRecordId"
          @click="togglePlay"
        />
      </div>
    </div>

    <div class="flex justify-center gap-1.5 opacity-30">
      <div v-for="i in 3" :key="i" class="h-1 w-1 rounded-full bg-black"></div>
    </div>
  </div>
</template>

<style scoped>
/* 讓螢幕內的 Select 選項 */
select option {
  background-color: white;
  color: #323333;
  padding: 10px;
  font-size: 16px;
}
</style>
