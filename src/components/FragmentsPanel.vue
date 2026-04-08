<!-- 碎片蒐集系統 -->
<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { FRAGMENT_TYPES, NOTE_MAX_DURATION_MS, getFragmentById } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';

/**初始化 Pinia Store
 * 用於獲取當前使用者的音軌收集進度與狀態
 */
const fragments = useFragmentsStore();

/**
 * 計算屬性：解構碎片總數與解鎖數量
 */
const summary = computed(() => {
  const { unlockedCount } = fragments.collectionSummary;
  const all = FRAGMENT_TYPES.length;
  return {
    unlockedCount,
    all,
  };
});

/**
 * 計算百分比函數(收集進度條)
 * 參數： count - 當前收集數量
 * 返回值： 0-100 的整數，用於 UI 進度條顯示
 * 邏輯：以 4 個為一個基準單位計算完成率，最高不超過 100%
 */
function pct(count: number): number {
  return Math.min(100, Math.floor((count / 4) * 100));
}

const displayFragments = computed(() => {
  return FRAGMENT_TYPES.map((f) => {
    const count = fragments.getCount(f.id);
    const progress = pct(count);
    return {
      ...f,
      count,
      progress,
      isUnlocked: count >= 4,
      isDiscovered: count >= 1,
    };
  });
});
// --- 音訊播放控制狀態 ---

//追蹤當前播放中的碎片 ID (用於 UI 響應式切換按鈕文字)
const playingId = ref<string | null>(null);
//儲存原生的 Audio HTML 物件引用 (不使用 ref 以優化效能)
let playingAudio: HTMLAudioElement | null = null;
// 儲存自動停止用的計時器 Handle
let playingStopHandle: number | null = null;

//停止播放函式
function stopListening() {
  playingId.value = null; //靜止中

  // 清除尚未觸發的超時保護計時器
  if (playingStopHandle != null) {
    window.clearTimeout(playingStopHandle); //clearTimeout 確保之前的自動停止邏輯不會影響到下一個聲音。
    playingStopHandle = null;
  }
  // 停止播放並重置音訊時間軸(使用原生物件)
  if (playingAudio) {
    try {
      playingAudio.pause(); //停止
      playingAudio.currentTime = 0; //歸零
    } catch {
      // 捕捉並忽略可能發生的 DOMException（例如音訊尚未載入完成時呼叫 pause）
    }
  }
  playingAudio = null; //不使用音訊物件(釋放資源)
}

/**
 * 切換聆聽播放狀態
 * 參數:id - 音軌碎片唯一的識別碼
 */
function toggleListen(id: string) {
  // 若該碎片尚未收集，則不允許播放
  if (fragments.getCount(id) < 1) return;

  // 若點擊的是目前正在播放的音軌，則執行停止並結束
  if (playingId.value === id) {
    stopListening();
    return;
  }
  // 切換新音軌前先清理舊的播放
  stopListening();

  // 取得音檔路徑(找不到則終止)
  const url = getFragmentById(id)?.trackAudioUrl;
  if (!url) return;

  // 初始化音訊
  const audio = new Audio(url);
  audio.volume = 0.95; // 音量控制

  // 監聽自然結束：當音樂播完時自動呼叫停止
  audio.onended = () => {
    // 確保只在該音軌還是「當前音軌」時執行停止
    if (playingAudio === audio) stopListening();
  };

  // 儲存引用以便後續控制
  playingAudio = audio;
  playingId.value = id; //將 playingId.value 更新為當前 ID

  // 執行非同步播放，並處理瀏覽器自動播放攔截政策
  void audio.play().catch(() => {
    stopListening();
  });

  // 設定強制停止計時器，避免音軌播放超過系統限制的最大時長 (NOTE_MAX_DURATION_MS)
  playingStopHandle = window.setTimeout(() => {
    if (playingAudio) stopListening();
  }, NOTE_MAX_DURATION_MS);
}

onUnmounted(() => stopListening());
</script>

<template>
  <div class="px-6 py-4 sm:px-8">
    <p class="md:text-md py-2 text-sm">
      Progress:
      <span class="font-bold text-blue-500"> {{ summary.unlockedCount }}/{{ summary.all }} </span>
      {{ summary.unlockedCount > 1 ? 'tracks' : 'track' }}
    </p>

    <!-- 音軌列表 -->
    <div class="mt-2 grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
      <div v-for="f in displayFragments" :key="f.id" class="rounded-2xl border border-gray-300 bg-white p-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div
              class="inline-block h-3 w-3 rounded-full"
              :style="{ background: f.color, boxShadow: `0 0 16px ${f.color}55` }"
            />
            <div>
              <div class="font-semibold">
                {{ f.isDiscovered ? f.label : 'Unknown' }}
              </div>
              <div class="text-xs text-gray-500">fragments x {{ f.count }}</div>
            </div>
          </div>

          <div class="text-righttext-lg self-end-safe font-semibold" :style="{ color: f.color }">{{ f.progress }}%</div>
        </div>

        <div class="bg-background mt-2 h-2 overflow-hidden rounded-full">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: `${f.progress}%`, background: f.color }"
          />
        </div>

        <div class="mt-3 flex items-center justify-between gap-2">
          <p
            class="text-sm transition-colors duration-300"
            :class="f.isUnlocked ? 'text-green font-bold' : 'font-medium text-black opacity-60'"
          >
            {{ f.isUnlocked ? 'Released' : 'Unavailable' }}
          </p>

          <button
            class="rounded-xl border border-gray-300 bg-gray-200 px-3 py-2 text-sm font-bold transition-opacity"
            :disabled="!f.isUnlocked"
            @click="toggleListen(f.id)"
            :class="[!f.isUnlocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:opacity-80']"
          >
            {{ playingId === f.id ? 'Pause' : 'Play' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
