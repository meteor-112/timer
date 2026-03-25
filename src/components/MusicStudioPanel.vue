<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog';
import { useFragmentsStore } from '@/stores/fragments';
import { useMusicStore, type MusicRecord, type MusicTrackMix } from '@/stores/music';

const fragments = useFragmentsStore();
const music = useMusicStore();

const tracks = ref<MusicTrackMix[]>([]);
const recordName = ref('');
const pinAfterCreate = ref(true);
const generating = ref(false);
const previewPlaying = ref(false);
const playingRecordId = ref<string | null>(null);

let previewStopHandle: number | null = null;
const previewStartHandles = new Set<number>();
let previewAudios: HTMLAudioElement[] = [];
let recordAudioEl: HTMLAudioElement | null = null;

const maxTracks = 5;

const canAddTrack = computed(() => tracks.value.length < maxTracks && fragments.unlockedNoteIds.length > 0);

const canCreate = computed(() => {
  if (tracks.value.length < 1) return false;
  if (tracks.value.length > maxTracks) return false;
  const unlocked = new Set(fragments.unlockedNoteIds);
  return tracks.value.every((t) => t.noteId && unlocked.has(t.noteId));
});

function addTrack() {
  if (!canAddTrack.value) return;
  const first = fragments.unlockedNoteIds[0] ?? '';
  tracks.value.push({
    noteId: first,
    offsetSec: 0,
    volume: 0.8,
  });
}

function removeTrack(idx: number) {
  tracks.value.splice(idx, 1);
}

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

async function togglePreview() {
  if (previewPlaying.value) {
    stopPreview();
    return;
  }

  stopPreview();
  stopRecordPlayback();
  previewPlaying.value = true;

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

  previewStopHandle = window.setTimeout(() => {
    stopPreview();
  }, 30_000);
}

function colorFor(noteId: string): string {
  return FRAGMENT_TYPES.find((f) => f.id === noteId)?.color ?? '#acd7ff';
}

async function createRecord() {
  if (!canCreate.value) return;
  generating.value = true;
  try {
    stopPreview();
    const record = music.createRecord([...tracks.value], recordName.value);
    await music.ensureRecordMp3(record.id);
    tracks.value = [];
    recordName.value = '';
    if (pinAfterCreate.value) music.setPinned(record.id);
  } finally {
    generating.value = false;
  }
}

const shareCode = ref('');
const importCode = ref('');

function startShare(recordId: string) {
  const code = music.shareRecord(recordId);
  shareCode.value = code ?? '';
}

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

function trackCountLabel(r: MusicRecord): number {
  return r.mix?.length ?? r.noteIds.length;
}

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
    <header class="relative overflow-hidden rounded-[32px] border border-stone-200 bg-stone-100 p-6">
      <div class="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 class="flex items-center gap-2 text-lg font-bold text-stone-800">
            <span class="text-xl">⚒️</span> 音樂合成工坊
          </h3>
          <p class="mt-1 text-sm leading-relaxed text-stone-500">
            挑選最多 5 項碎片，揉合時間與音量，<br />
            煉製專屬的 30 秒靜心旋律。
          </p>
        </div>
        <div
          class="flex items-center gap-3 self-start rounded-2xl border border-white bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-sm md:self-center"
        >
          <div class="relative flex h-3 w-3">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
            <span class="relative inline-flex h-3 w-3 rounded-full bg-sky-500"></span>
          </div>
          <span class="text-sm font-semibold text-stone-700">可用材料：{{ fragments.unlockedNoteIds.length }}</span>
        </div>
      </div>
      <div class="pointer-events-none absolute -right-4 -bottom-4 opacity-5 select-none">
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6Z"
          />
        </svg>
      </div>
    </header>

    <div class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-6 rounded-full bg-stone-300"></span>
          <h4 class="text-sm font-bold tracking-widest text-stone-400 uppercase">實時調音台</h4>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="tracks.length > 0"
            @click="togglePreview"
            class="group flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 transition-all hover:border-stone-400 active:scale-95"
          >
            <span :class="previewPlaying ? 'text-red-500' : 'text-stone-400'">{{ previewPlaying ? '■' : '▶' }}</span>
            {{ previewPlaying ? '停止試聽' : '試聽混音' }}
          </button>
          <button
            :disabled="!canAddTrack"
            @click="addTrack"
            class="flex items-center gap-2 rounded-xl bg-stone-800 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-stone-200 transition-all hover:bg-black active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            <span>+</span> 加入音軌
          </button>
        </div>
      </div>

      <div
        v-if="tracks.length === 0"
        class="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-stone-200 bg-stone-50/50 py-12"
      >
        <div class="mb-3 text-3xl opacity-20">🎚️</div>
        <p class="text-sm text-stone-400">調音台上空無一物，請加入音軌開始創作</p>
      </div>

      <transition-group name="list" tag="div" class="grid gap-4">
        <div
          v-for="(t, idx) in tracks"
          :key="idx"
          class="group relative rounded-[28px] border border-stone-100 bg-white p-5 shadow-sm transition-all hover:border-stone-200 hover:shadow-md"
        >
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500"
                >{{ idx + 1 }}</span
              >
              <span class="text-sm font-bold text-stone-700">聲部配置</span>
            </div>
            <button
              @click="removeTrack(idx)"
              class="p-2 text-xs font-medium text-stone-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
            >
              移除音軌
            </button>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-stone-400 uppercase">聲音來源</label>
              <select
                v-model="t.noteId"
                class="w-full appearance-none rounded-xl border-none bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 focus:ring-2 focus:ring-stone-200"
              >
                <option v-for="id in fragments.unlockedNoteIds" :key="id" :value="id">
                  {{ fragments.getFragmentLabel(id) }}
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between">
                <label class="text-[10px] font-bold text-stone-400 uppercase">出現時間</label>
                <span class="font-mono text-[10px] font-bold text-stone-600">{{ t.offsetSec.toFixed(1) }}s</span>
              </div>
              <input
                v-model.number="t.offsetSec"
                type="range"
                min="0"
                max="30"
                step="0.1"
                class="w-full accent-stone-700"
              />
            </div>

            <div class="space-y-2">
              <div class="flex justify-between">
                <label class="text-[10px] font-bold text-stone-400 uppercase">增益量</label>
                <span class="font-mono text-[10px] font-bold text-stone-600">{{ Math.round(t.volume * 100) }}%</span>
              </div>
              <input
                v-model.number="t.volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full accent-stone-700"
              />
            </div>
          </div>

          <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-stone-50">
            <div
              class="h-full rounded-full opacity-60 transition-all duration-500"
              :style="{ width: `${(t.offsetSec / 30) * 100}%`, background: colorFor(t.noteId) }"
            ></div>
          </div>
        </div>
      </transition-group>
    </div>

    <footer class="relative overflow-hidden rounded-[32px] border border-stone-300 bg-stone-200/50 p-8 shadow-inner">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>

      <div class="relative z-10 grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
        <div class="space-y-5">
          <div class="space-y-2">
            <label class="ml-1 text-xs font-bold tracking-widest text-stone-500 uppercase">唱片標題</label>
            <input
              v-model="recordName"
              type="text"
              placeholder="例如：午後的禪意..."
              class="w-full rounded-2xl border-stone-300 bg-white px-4 py-3 text-stone-800 shadow-sm transition-all placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <label class="group flex w-fit cursor-pointer items-center gap-3">
            <div
              class="relative flex h-6 w-6 items-center justify-center rounded-lg border-2 border-stone-400 bg-white transition-colors group-hover:border-emerald-500"
            >
              <input type="checkbox" v-model="pinAfterCreate" class="absolute cursor-pointer opacity-0" />
              <div v-show="pinAfterCreate" class="h-3 w-3 rounded-sm bg-emerald-500"></div>
            </div>
            <span class="text-sm font-medium text-stone-600">製作完成後自動置頂</span>
          </label>
        </div>

        <div class="flex flex-col items-end gap-4">
          <div class="rounded-xl border border-white/50 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md">
            <p class="text-[11px] leading-tight text-stone-500">
              <span class="font-bold text-emerald-600">準備就緒：</span>將合成 30 秒高品質音軌
            </p>
          </div>
          <button
            :disabled="!canCreate || generating"
            @click="createRecord"
            class="w-full rounded-2xl px-10 py-4 text-base font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale lg:w-auto"
            :class="
              generating
                ? 'cursor-wait bg-stone-300 text-stone-500'
                : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-500 hover:shadow-emerald-300'
            "
          >
            {{ generating ? '⚡ 正在煉製中...' : '🛠️ 製作並儲存唱片' }}
          </button>
        </div>
      </div>
    </footer>

    <hr class="border-stone-100" />

    <div class="space-y-6">
      <div class="flex items-center gap-2">
        <span class="text-xl">📻</span>
        <h4 class="text-base font-bold text-stone-800">工坊收藏夾</h4>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="r in music.musicRecords"
          :key="r.id"
          class="group relative rounded-[28px] border border-stone-100 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h5 class="font-bold text-stone-800 transition-colors group-hover:text-stone-900">{{ r.name }}</h5>
              <p class="flex items-center gap-2 text-[10px] font-medium text-stone-400">
                <span>{{ trackCountLabel(r) }} 音軌</span>
                <span class="h-1 w-1 rounded-full bg-stone-200"></span>
                <span>{{ new Date(r.createdAt).toLocaleDateString() }}</span>
              </p>
              <div
                v-if="music.pinnedId === r.id"
                class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
              >
                <span class="h-1 w-1 rounded-full bg-emerald-500"></span> 已置頂
              </div>
            </div>
            <button
              @click="toggleRecordPlayback(r.id)"
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 shadow-sm transition-all hover:bg-stone-200 active:scale-90"
            >
              <span class="text-lg">{{ playingRecordId === r.id ? '■' : '▶' }}</span>
            </button>
          </div>

          <div class="mt-6 flex flex-wrap gap-2 border-t border-stone-50 pt-4">
            <button
              @click="music.setPinned(music.pinnedId === r.id ? null : r.id)"
              class="rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-800 hover:text-white"
            >
              {{ music.pinnedId === r.id ? '取消置頂' : '置頂' }}
            </button>
            <button
              @click="beginRename(r)"
              class="rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-200"
            >
              改名
            </button>
            <button
              @click="startShare(r.id)"
              class="rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-500 transition-all hover:bg-stone-200"
            >
              分享
            </button>
            <button
              @click="music.removeRecord(r.id)"
              class="ml-auto rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-red-400 transition-all hover:bg-red-50"
            >
              刪除
            </button>
          </div>

          <div
            v-if="editTargetId === r.id"
            class="animate-in fade-in slide-in-from-top-2 mt-4 rounded-2xl bg-stone-50 p-3"
          >
            <input
              v-model="editName"
              type="text"
              class="w-full rounded-xl border-stone-200 bg-white px-3 py-2 text-xs focus:ring-stone-400"
            />
            <div class="mt-2 flex gap-2">
              <button
                @click="saveRename"
                class="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-bold text-white"
              >
                確認儲存
              </button>
              <button
                @click="editTargetId = null"
                class="flex-1 rounded-lg bg-stone-200 px-3 py-2 text-[10px] font-bold text-stone-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <hr class="border-stone-200" />

    <div class="mt-12 space-y-6 rounded-[32px] border border-stone-200 bg-stone-100/80 p-6">
      <div class="flex items-center gap-2 px-1">
        <span class="text-xl">✉️</span>
        <h4 class="text-base font-bold text-stone-800">工坊通訊</h4>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
/* 列表過渡動畫 */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 滑桿美化 */
input[type='range'] {
  height: 4px;
  -webkit-appearance: none;
  background: #e7e5e4;
  border-radius: 999px;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #44403c;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
