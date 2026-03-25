<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getFragmentById } from '@/data/audioCatalog';
import { useWorldStore } from '@/stores/world';
import { useMusicStore } from '@/stores/music';
import { useFragmentsStore } from '@/stores/fragments';
import { useTimerStore } from '@/stores/timer';
import { useAudioEngine } from '@/composables/useAudioEngine';
import type { WorldUser } from '@/stores/world';

const world = useWorldStore();
const music = useMusicStore();
const fragments = useFragmentsStore();
const timer = useTimerStore();
const audio = useAudioEngine();

const nowMs = ref(Date.now());
let nowHandle: number | null = null;

onMounted(() => {
  world.initSimulation({ size: 5 });
  nowHandle = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  world.stopSimulation();
  if (nowHandle != null) window.clearInterval(nowHandle);
  stopPinnedPlayback();
});

function formatFocusMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function colorForNoteId(id: string): string {
  return getFragmentById(id)?.color ?? '#acd7ff';
}

const selfPinnedNoteIds = computed(() => {
  if (music.pinnedRecord) return music.pinnedRecord.noteIds;
  if (fragments.unlockedNoteIds.length) return fragments.unlockedNoteIds.slice(0, 3);
  return ['dawn', 'mint'];
});

const selfPrimaryId = computed(() => selfPinnedNoteIds.value[0] ?? 'dawn');

const focusUsers = computed(() => {
  const list: Array<{
    id: string;
    name: string;
    isSelf: boolean;
    focusStartedAtMs: number;
    pinnedNoteIds: string[];
    pinnedPrimaryId: string;
    isFocusing: boolean;
    pinnedRecordId?: string | null;
  }> = [];

  if (timer.status === 'running') {
    const pinnedRecordId = music.pinnedRecord?.id ?? null;
    list.push({
      id: 'self',
      name: '你',
      isSelf: true,
      focusStartedAtMs: Date.now() - timer.elapsedMs,
      pinnedNoteIds: selfPinnedNoteIds.value,
      pinnedPrimaryId: selfPrimaryId.value,
      isFocusing: true,
      pinnedRecordId,
    });
  }

  for (const u of world.focusingUsers) {
    list.push({ ...u, isSelf: false });
  }
  return list;
});

const playingUserId = ref<string | null>(null);
let playbackAudioEl: HTMLAudioElement | null = null;

function stopPinnedPlayback() {
  playingUserId.value = null;
  if (!playbackAudioEl) return;
  try {
    playbackAudioEl.pause();
    playbackAudioEl.currentTime = 0;
  } catch {
    // ignore
  }
  playbackAudioEl = null;
}

async function togglePinnedForUser(
  u:
    | (WorldUser & { pinnedRecordId?: string | null })
    | { id: string; pinnedNoteIds: string[]; pinnedRecordId?: string | null },
) {
  if (playingUserId.value === u.id) {
    stopPinnedPlayback();
    return;
  }

  stopPinnedPlayback();

  const pinnedRecordId = (u as { pinnedRecordId?: string | null }).pinnedRecordId;
  if (pinnedRecordId) {
    const ok = await music.ensureRecordMp3(pinnedRecordId).catch(() => false);
    if (ok) {
      const url = await music.getRecordMp3ObjectUrl(pinnedRecordId);
      if (url) {
        const el = new Audio(url);
        playbackAudioEl = el;
        playingUserId.value = u.id;
        el.onended = () => {
          if (playbackAudioEl === el) stopPinnedPlayback();
        };
        void el.play().catch(() => stopPinnedPlayback());
        return;
      }
    }
  }

  const fallbackId = u.pinnedNoteIds[0];
  const fallbackUrl = fallbackId ? getFragmentById(fallbackId)?.trackAudioUrl : null;
  if (fallbackUrl) {
    const el = new Audio(fallbackUrl);
    playbackAudioEl = el;
    playingUserId.value = u.id;
    el.onended = () => {
      if (playbackAudioEl === el) stopPinnedPlayback();
    };
    void el.play().catch(() => stopPinnedPlayback());
    return;
  }

  // 最後退路：若無可用 mp3，仍保留舊合成播放（此分支無法精準停止）
  playingUserId.value = u.id;
  await audio.playRecordByNoteIds(u.pinnedNoteIds).catch(() => {
    // ignore
  });
  playingUserId.value = null;
}
</script>

<template>
  <section class="min-h-screen bg-[#f8f9fa] px-6 py-4">
    <header class="mb-6 flex items-start justify-between">
      <div>
        <h3 class="mt-2 text-sm font-medium text-[#999]">
          目前有 <span class="text-[#666]">{{ focusUsers.length }}</span> 人正在專注
        </h3>
      </div>

      <div class="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
        <input
          v-model="world.roomId"
          type="text"
          placeholder="房間 ID"
          class="w-24 bg-transparent px-3 py-1 text-sm text-[#666] outline-none"
        />
        <button
          @click="world.setRoomId(world.roomId)"
          class="rounded-xl bg-[#f0f2f5] px-4 py-1.5 text-xs font-bold text-[#777] transition-colors hover:bg-[#e4e6e9]"
        >
          切換
        </button>
      </div>
    </header>

    <div class="flex flex-col gap-4">
      <div
        v-for="u in focusUsers"
        :key="u.id"
        class="group relative flex items-center justify-between rounded-[32px] border border-gray-50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
      >
        <div class="flex items-center gap-5">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f2f5] text-[#9ca3af]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-[#4a4a4a]">{{ u.name }}</span>
              <span class="text-sm font-normal text-[#999]">
                {{ Math.floor((nowMs - u.focusStartedAtMs) / 60000) }} 分鐘
              </span>
            </div>
            <div class="mt-0.5 text-sm font-medium text-[#888]">
              {{ '正在專注中' }}
            </div>
            <div class="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#7c73e6]">
              <span class="text-base">♫</span>
              <span>{{ fragments.getFragmentLabel(u.pinnedPrimaryId) }}</span>
            </div>
          </div>
        </div>

        <button
          @click="togglePinnedForUser(u)"
          class="flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white text-[#888] shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all hover:scale-110 active:scale-95"
        >
          <span class="ml-0.5 text-xl">
            {{ playingUserId === u.id ? 'Ⅱ' : '▷' }}
          </span>
        </button>
      </div>

      <div v-if="focusUsers.length === 0" class="py-20 text-center">
        <div class="mb-4 text-4xl opacity-20">☁️</div>
        <p class="font-medium text-[#bbb]">目前房間內沒有人，開始專注來加入吧</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 讓捲軸對齊圖片中的細長灰色樣式 */
section::-webkit-scrollbar {
  width: 6px;
}
section::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}
section::-webkit-scrollbar-track {
  background: transparent;
}
</style>
