<!-- 音樂工坊 -->
<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import PlayStopButton from './PlayStopButton.vue';
import ActionIconButton from './ActionIconButton.vue';
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';
import { useMusicStore, type MusicRecord, type MusicTrackMix } from '@/stores/music';
// 引入lucide
import {
  AudioLines,
  Disc2,
  Play,
  Pin,
  PinOff,
  Plus,
  RadioTower,
  Share2,
  Square,
  SquarePen,
  Trash2,
} from 'lucide-vue-next';

// --- 實體與狀態管理 ---
const fragments = useFragmentsStore(); // 碎片倉庫：處理碎片解鎖與進度
const music = useMusicStore(); // 音樂倉庫：處理唱片製作、分享與持久化

// --- 響應式狀態 (UI 綁定) ---
const tracks = ref<MusicTrackMix[]>([]); // 當前編輯中的混音軌列表
const recordName = ref(''); // 預計製作的唱片名稱
const pinAfterCreate = ref(true); // 製作完成後是否自動置頂
const generating = ref(false); // 是否正在生成 MP3 (Loading 狀態)
const previewPlaying = ref(false); // 混音預聽狀態
const playingRecordId = ref<string | null>(null); // 當前正在播放的已存唱片 ID

// --- 非響應式變數 (內部控制與計時器) ---
let previewStopHandle: number | null = null; // 預聽總時長 (30s) 的定時器
const previewStartHandles = new Set<number>(); // 各音軌延遲觸發的定時器集合
let previewAudios: HTMLAudioElement[] = []; // 預聽中的 Audio 物件池
let recordAudioEl: HTMLAudioElement | null = null; // 播放已存唱片的單一 Audio 物件

const maxTracks = 5; // 最大混音軌數量限制

// --- 計算屬性 (Getters) ---

// 判斷是否能增加音軌：小於 5 條且至少有一種已解鎖碎片
const canAddTrack = computed(() => tracks.value.length < maxTracks && fragments.unlockedNoteIds.length > 0);
// 判斷是否滿足製作條件：至少 1 軌、不超過 5 軌，且所有音軌都必須是已解鎖狀態
const canCreate = computed(() => {
  if (tracks.value.length < 1) return false;
  if (tracks.value.length > maxTracks) return false;
  const unlocked = new Set(fragments.unlockedNoteIds);
  return tracks.value.every((t) => t.noteId && unlocked.has(t.noteId));
});

const sortedRecords = computed(() => {
  return [...music.musicRecords].sort((a, b) => {
    // 1. 先排置頂
    const aPinned = music.pinnedId === a.id ? 1 : 0;
    const bPinned = music.pinnedId === b.id ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    // 2. 再排時間 (由新到舊)
    return b.createdAt - a.createdAt;
  });
});

// --- 操作方法 (Actions) ---

//新增音軌：預設選擇第一個已解鎖碎片，音量 0.8
function addTrack() {
  if (!canAddTrack.value) return;
  const first = fragments.unlockedNoteIds[0] ?? '';
  const uniqueId = `tk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  tracks.value.push({
    id: uniqueId,
    noteId: first,
    offsetSec: 0,
    volume: 0.8,
  });
}
//新增音軌：預設選擇第一個已解鎖碎片，音量 0.8
function removeTrack(idx: number) {
  tracks.value.splice(idx, 1);
}

// 刪除確認
const confirmDelete = (id: string) => {
  if (window.confirm('確定要永久刪除這張唱片嗎？')) {
    music.removeRecord(id);
  }
};

//停止所有預聽行為，清空計時器與音訊物件
function stopPreview() {
  previewPlaying.value = false;
  if (previewStopHandle != null) {
    window.clearTimeout(previewStopHandle);
    previewStopHandle = null;
  }
  for (const h of previewStartHandles) window.clearTimeout(h);
  previewStartHandles.clear();
  for (const a of previewAudios) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {
      // ignore
    }
  }
  previewAudios = [];
}

//停止已存唱片的播放
function stopRecordPlayback() {
  playingRecordId.value = null;
  if (!recordAudioEl) return;
  try {
    recordAudioEl.pause();
    recordAudioEl.currentTime = 0;
  } catch {
    // ignore
  }
  recordAudioEl = null;
}

/** * 切換預聽狀態：模擬混音效果
 * 根據每條音軌的 offsetSec 設定 setTimeout 觸發播放
 */
async function togglePreview() {
  if (previewPlaying.value) {
    stopPreview();
    return;
  }

  stopPreview();
  stopRecordPlayback(); // 開始預聽前先停止其他播放
  previewPlaying.value = true;

  // 取得可播放的音軌資料 (包含 URL)
  const playable = tracks.value
    .map((t) => ({ ...t, url: getFragmentById(t.noteId)?.trackAudioUrl }))
    .filter((t) => !!t.url)
    .slice(0, maxTracks);

  for (const t of playable) {
    const delay = Math.max(0, Math.min(30, t.offsetSec)) * 1000;
    const h = window.setTimeout(() => {
      if (!previewPlaying.value) return;
      const audio = new Audio(t.url!);
      audio.volume = Math.max(0, Math.min(1, t.volume));
      previewAudios.push(audio);
      void audio.play().catch(() => {
        // ignore
      });
    }, delay);
    previewStartHandles.add(h);
  }
  // 30 秒後自動結束預聽
  previewStopHandle = window.setTimeout(() => {
    stopPreview();
  }, 30_000);
}

/** 取得音軌對應的代表色 (用於 UI 背景或進度條) */
function colorFor(noteId: string): string {
  return FRAGMENT_TYPES.find((f) => f.id === noteId)?.color ?? '#acd7ff';
}

/** 製作唱片：呼叫 Store 邏輯生成記錄並產出 MP3 */
async function createRecord() {
  if (!canCreate.value) return;
  generating.value = true;
  try {
    stopPreview();
    const record = music.createRecord([...tracks.value], recordName.value);
    await music.ensureRecordMp3(record.id); // 確保 MP3 檔案已生成並快取
    tracks.value = [];
    recordName.value = '';
    if (pinAfterCreate.value) music.setPinned(record.id); // 自動置頂
  } finally {
    generating.value = false;
  }
}

// --- 分享與匯入功能 ---
const shareCode = ref('');
const importCode = ref('');

//生成分享碼
function startShare(recordId: string) {
  const code = music.shareRecord(recordId);
  shareCode.value = code ?? '';
}

/** 匯入分享碼並自動生成對應唱片 */
async function doImport() {
  const code = importCode.value.trim();
  if (!code) return;
  const record = music.importShareCode(code);
  if (record) {
    importCode.value = '';
    generating.value = true;
    try {
      await music.ensureRecordMp3(record.id);
    } finally {
      generating.value = false;
    }
    music.setPinned(record.id);
  }
}

//複製分享碼至剪貼簿
async function copyShareCode() {
  const code = shareCode.value.trim();
  if (!code) return;
  try {
    const nav = globalThis.navigator;
    await nav.clipboard?.writeText(code);
  } catch {
    // ignore
  }
}

// --- 唱片改名功能 ---
const editTargetId = ref<string | null>(null);
const editName = ref('');

function beginRename(record: MusicRecord) {
  editTargetId.value = record.id;
  editName.value = record.name;
}

function saveRename() {
  if (!editTargetId.value) return;
  music.renameRecord(editTargetId.value, editName.value);
  editTargetId.value = null;
}

//計算顯示用的音軌總數
function trackCountLabel(r: MusicRecord): number {
  return r.mix?.length ?? r.noteIds.length;
}

//播放/終止單張已存唱片 (播放合成後的 MP3)
async function toggleRecordPlayback(recordId: string) {
  if (playingRecordId.value === recordId) {
    stopRecordPlayback();
    return;
  }

  stopPreview();
  stopRecordPlayback();

  const ok = await music.ensureRecordMp3(recordId).catch(() => false);
  if (!ok) return;
  const url = await music.getRecordMp3ObjectUrl(recordId);
  if (!url) return;

  const audio = new Audio(url);
  recordAudioEl = audio;
  playingRecordId.value = recordId;
  audio.onended = () => {
    if (recordAudioEl === audio) {
      stopRecordPlayback();
    }
  };
  void audio.play().catch(() => {
    stopRecordPlayback();
  });
}

onUnmounted(() => {
  stopPreview();
  stopRecordPlayback();
});
</script>

<template>
  <section class="space-y-8 px-5 py-6">
    <header class="z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <p class="mt-1 text-stone-500">
        挑選最多 5 項碎片，揉合時間與音量，<br />
        煉製專屬的 30 秒靜心旋律。
      </p>
      <div
        class="flex items-center gap-3 self-start rounded-2xl border border-white bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-sm md:self-center"
      >
        <div class="relative flex h-3 w-3">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#94eb09] opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-[#94eb09]"></span>
        </div>
        <span class="text-sm font-semibold">可用材料：{{ fragments.unlockedNoteIds.length }}</span>
      </div>
    </header>

    <!-- 調音臺 -->
    <div class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <section class="flex items-center gap-2">
          <AudioLines class="h-5 w-5" />
          <h3>工作臺</h3>
        </section>
        <div class="flex items-center gap-2">
          <button
            v-if="tracks.length > 0"
            @click="togglePreview"
            class="group flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 transition-all hover:border-stone-400 active:scale-95"
          >
            <Square v-show="previewPlaying" class="h-4 w-4 text-red-500" />
            <Play v-show="!previewPlaying" class="h-4 w-4 text-stone-400" />

            {{ previewPlaying ? '停止試聽' : '試聽混音' }}
          </button>
          <button
            :disabled="!canAddTrack"
            @click="addTrack"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-stone-200 transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            <Plus class="h-4 w-4" /> 加入音軌
          </button>
        </div>
      </div>
      <!-- 未加入音軌時 -->
      <div
        v-if="tracks.length === 0"
        class="relative flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-stone-200 bg-stone-50/50 py-12"
      >
        <p class="text-sm text-stone-400">工作臺上空無一物，請加入音軌開始創作</p>
        <!-- 背景圖 -->
        <div class="pointer-events-none absolute -right-4 -bottom-4 opacity-5 select-none">
          <svg width="120" height="120" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6Z"
            />
          </svg>
        </div>
      </div>

      <!-- 音軌列表 -->
      <div v-if="tracks.length > 0" class="flex flex-col gap-4">
        <transition-group name="list" tag="div" class="grid gap-4">
          <div
            v-for="(t, idx) in tracks"
            :key="t.id"
            class="group relative rounded-[28px] border border-stone-100 bg-white p-5 shadow-sm transition-all hover:border-stone-200 hover:shadow-md"
          >
            <!-- 上半部 -->
            <div class="mb-4 flex items-center justify-between gap-x-4">
              <p class="font-bold text-stone-500">音軌{{ idx + 1 }}</p>
              <select
                v-model="t.noteId"
                class="w-24 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1 text-sm font-medium text-stone-700 focus:ring-1 focus:ring-green-300"
              >
                <option v-for="id in fragments.unlockedNoteIds" :key="id" :value="id">
                  {{ fragments.getFragmentLabel(id) }}
                </option>
              </select>

              <button
                @click="removeTrack(idx)"
                class="ml-auto cursor-pointer rounded-lg p-2 text-stone-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
              >
                <Trash2 class="h-5 w-4" />
              </button>
            </div>
            <!-- 調整區 -->
            <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
              <!-- 時間 -->
              <div class="space-y-2">
                <div class="flex justify-between">
                  <label :for="'track-offset-' + idx" class="cursor-pointer text-sm font-bold text-stone-400 uppercase">
                    出現時間
                  </label>
                  <span class="font-mono text-sm font-bold text-stone-600">{{ t.offsetSec.toFixed(1) }}s</span>
                </div>
                <input
                  :id="'track-offset-' + idx"
                  v-model.number="t.offsetSec"
                  type="range"
                  min="0"
                  max="30"
                  step="0.1"
                  class="w-full bg-stone-300"
                />
              </div>
              <!-- 音量 -->
              <div class="space-y-2">
                <div class="flex justify-between">
                  <label :for="'track-volume-' + idx" class="cursor-pointer text-sm font-bold text-stone-400 uppercase">
                    音量
                  </label>
                  <span class="font-mono text-sm font-bold text-stone-600">{{ Math.round(t.volume * 100) }}%</span>
                </div>
                <input
                  :id="'track-volume-' + idx"
                  v-model.number="t.volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="w-full bg-stone-300"
                />
              </div>
            </div>
          </div>
        </transition-group>
        <transition name="fade">
          <footer
            class="relative mt-2 overflow-hidden rounded-[32px] border border-stone-300 bg-stone-300/90 p-8 shadow-inner"
          >
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 to-transparent"></div>
            <div class="space-y-3">
              <label class="text ml-2 font-bold tracking-widest text-black">唱片標題</label>

              <input
                v-model="recordName"
                type="text"
                placeholder="例如：午後的禪意..."
                class="mt-1 w-full rounded-2xl border-stone-300 bg-white px-4 py-3 text-stone-800 shadow-sm transition-all placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />

              <div class="flex justify-between">
                <label class="group flex w-fit cursor-pointer items-center gap-3">
                  <div
                    class="relative flex h-6 w-6 items-center justify-center rounded-lg border-2 border-stone-400 bg-white transition-colors group-hover:border-emerald-500"
                  >
                    <input type="checkbox" v-model="pinAfterCreate" class="absolute cursor-pointer opacity-0" />

                    <div v-show="pinAfterCreate" class="h-3 w-3 rounded-sm bg-emerald-500"></div>
                  </div>

                  <span class="text-sm font-medium text-stone-600">製作完成後自動置頂</span>
                </label>

                <button
                  :disabled="!canCreate || generating"
                  @click="createRecord"
                  class="w-full rounded-xl px-4 py-2 text-base font-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale lg:w-auto"
                  :class="
                    generating
                      ? 'cursor-wait bg-stone-300 text-stone-500'
                      : 'bg-emerald-400 text-white hover:bg-emerald-500'
                  "
                >
                  {{ generating ? '製作中...' : '儲存' }}
                </button>
              </div>
            </div>
          </footer>
        </transition>
      </div>
    </div>

    <!-- 收藏夾 -->
    <div class="space-y-6">
      <section class="flex items-center gap-2">
        <Disc2 class="h-5 w-5" />
        <h3>收藏夾</h3>
      </section>
      <div
        v-if="music.musicRecords.length === 0"
        class="relative flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-stone-200 bg-stone-50/50 py-12"
      >
        <p class="text-sm text-stone-400">收藏上空無一物，加入你的音樂！</p>
        <!-- 背景圖 -->
        <div class="pointer-events-none absolute -right-4 -bottom-4 opacity-5 select-none">
          <svg width="120" height="120" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6Z"
            />
          </svg>
        </div>
      </div>
      <!-- 收藏列表 -->
      <div v-if="music.musicRecords.length > 0">
        <transition-group name="fade" tag="div" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            v-for="r in sortedRecords"
            :key="r.id"
            class="group relative flex flex-col rounded-xl border-r-4 border-b-4 border-stone-300 bg-stone-200 p-1.5 transition-all hover:translate-y-0.5"
          >
            <div v-if="music.pinnedId === r.id" class="absolute -top-2 -left-2 z-20">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                <Pin class="h-3.5 w-3.5 fill-current" />
              </div>
            </div>

            <div class="flex flex-1 flex-col rounded-lg bg-stone-100 p-4 shadow-inner">
              <div class="] relative mb-6 min-h-[70px] rounded-md border-2 border-stone-300 bg-gray-200 p-3">
                <section class="min-w-0 flex-1">
                  <h5 class="text-text ] truncate font-mono text-lg font-bold tracking-wider">
                    {{ r.name }}
                  </h5>
                  <div
                    class="mt-1 flex items-center gap-2 font-mono text-[9px] font-medium tracking-widest text-stone-500 uppercase"
                  >
                    <span class="rounded-sm bg-blue-400/20 px-1 text-emerald-900">Playing</span>
                    <span class="animate-pulse">●</span>
                    <span class="ml-auto text-stone-400">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
                  </div>
                </section>
                <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
              </div>

              <div
                class="] relative mb-6 flex h-20 items-center justify-between overflow-hidden rounded-lg border-2 border-stone-300 bg-gray-300 p-2"
              >
                <div
                  class="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-stone-500 bg-gray-400 shadow-sm"
                >
                  <div class="h-8 w-8 rounded-full border-4 border-dashed border-stone-700 opacity-40"></div>
                </div>

                <div class="absolute inset-x-12 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 opacity-20">
                  <div class="h-0.5 w-full bg-stone-900 to-transparent"></div>
                  <div class="h-0.5 w-full bg-stone-900 to-transparent"></div>
                </div>

                <div
                  class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-stone-700 bg-gray-200 shadow-sm"
                >
                  <div class="absolute inset-0 flex items-center justify-center">
                    <PlayStopButton
                      :is-playing="playingRecordId === r.id"
                      class="scale-110 transition-transform hover:scale-105"
                      @click="toggleRecordPlayback(r.id)"
                    />
                  </div>
                </div>

                <div class="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
              </div>

              <div class="mt-auto flex items-center justify-between">
                <ActionIconButton
                  :icon="music.pinnedId === r.id ? PinOff : Pin"
                  :variant="music.pinnedId === r.id ? 'emerald' : 'stone'"
                  :title="music.pinnedId === r.id ? '取消置頂' : '置頂'"
                  class="border border-stone-200 bg-stone-50 shadow-sm"
                  @click="music.setPinned(music.pinnedId === r.id ? null : r.id)"
                />
                <ActionIconButton
                  :icon="SquarePen"
                  title="修改名稱"
                  variant="stone"
                  class="border border-stone-200 bg-stone-50 shadow-sm"
                  @click="beginRename(r)"
                />
                <ActionIconButton
                  :icon="Share2"
                  title="分享"
                  variant="stone"
                  class="border border-stone-200 bg-stone-50 shadow-sm"
                  @click="startShare(r.id)"
                />
                <ActionIconButton
                  :icon="Trash2"
                  title="刪除"
                  variant="red"
                  class="border border-stone-200 bg-stone-50 text-stone-400 shadow-sm hover:text-red-500"
                  @click="confirmDelete(r.id)"
                />
              </div>
            </div>

            <div
              v-if="editTargetId === r.id"
              class="animate-in slide-in-from-top-1 absolute inset-x-4 top-4 z-30 rounded-md bg-amber-50 p-4 shadow-xl ring-1 ring-amber-200/50"
            >
              <div class="mb-2 flex items-center justify-between border-b border-amber-200 pb-1">
                <span class="font-mono text-[10px] font-bold text-amber-600 uppercase">Edit Label</span>
                <span class="text-[10px] text-amber-400">#001</span>
              </div>
              <input
                v-model="editName"
                type="text"
                @keyup.enter="saveRename"
                @keyup.esc="editTargetId = null"
                autofocus
                class="w-full border-none bg-transparent p-0 font-serif text-lg font-bold text-stone-800 placeholder:text-amber-200 focus:ring-0"
              />
              <div class="mt-4 flex gap-2">
                <button
                  @click="saveRename"
                  class="flex-1 rounded-md bg-amber-600 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95"
                >
                  確認更新
                </button>
                <button
                  @click="editTargetId = null"
                  class="flex-1 rounded-md border border-amber-200 bg-white py-2 text-[10px] font-bold text-amber-600 hover:bg-amber-100 active:scale-95"
                >
                  取消
                </button>
              </div>
              <div class="absolute right-0 bottom-0 h-4 w-4 rounded-tl-full bg-amber-100/50"></div>
            </div>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- 通訊 -->
    <div class="space-y-6">
      <section class="flex items-center gap-2">
        <RadioTower class="h-5 w-5" />
        <h3>工坊通訊</h3>
      </section>
      <div class="grid grid-cols-1 gap-6 rounded-[32px] border border-stone-200 bg-stone-100/80 p-6 sm:grid-cols-2">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-stone-500 uppercase">分享碼</label>
            <span class="text-[10px] text-stone-400">點擊唱片「分享」自動填入</span>
          </div>
          <textarea
            v-model="shareCode"
            placeholder="尚未選取分享內容"
            class="min-h-28 w-full rounded-2xl border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-600 focus:ring-stone-200"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl bg-sky-100 px-4 py-2.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-200 disabled:opacity-40"
              :disabled="!shareCode.trim()"
              @click="copyShareCode"
            >
              複製分享碼
            </button>
            <button
              class="rounded-xl bg-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-300"
              @click="shareCode = ''"
            >
              清空
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="text-xs font-bold text-stone-500 uppercase">匯入唱片</label>
          <textarea
            v-model="importCode"
            placeholder="在此貼上好友的分享碼..."
            class="min-h-28 w-full rounded-2xl border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-600 focus:ring-stone-200"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-40"
              :disabled="!importCode.trim()"
              @click="doImport"
            >
              匯入並自動置頂
            </button>
            <button
              class="rounded-xl bg-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-300"
              @click="importCode = ''"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
h3 {
  font-weight: bold;
  font-size: 20px;
  letter-spacing: 0.25rem;
}
/* 列表過渡動畫 */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 滑桿美化 */
input[type='range'] {
  height: 4px;
  -webkit-appearance: none;
  border-radius: 999px;
  background: #e5e7eb; /* 建議給條柱一個底色 */
  outline: none;
}

/* 1. 定義平時的 Thumb 狀態 */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #94eb09;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
/* 2. 定義點擊（Active）時的狀態 */
input[type='range']:active::-webkit-slider-thumb {
  box-shadow: 0 0 0 6px rgba(153, 243, 9, 0.2); /* 外環陰影 */
}
/* 針對 Firefox 的相容性設定 */
input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #94eb09;
  border: none;
  transition: all 0.15s ease-in-out;
}
</style>
