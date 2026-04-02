<!-- 世界系統 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PlayStopButton from './PlayStopButton.vue';
import { getFragmentById } from '@/data/audioCatalog';
import { useWorldStore } from '@/stores/world';
import { useMusicStore } from '@/stores/music';
import { useFragmentsStore } from '@/stores/fragments';
import { useTimerStore } from '@/stores/timer';
import { useAudioEngine } from '@/composables/useAudioEngine';
import type { WorldUser } from '@/stores/world';
import { useAuthStore } from '@/stores/auth';
import { User } from 'lucide-vue-next';

/**
 * 定義組件內部使用的 User 介面，擴充 pinnedRecordId 可選屬性
 */
interface DisplayUser {
  id: string;
  name: string;
  isSelf: boolean;
  status: 'focus' | 'rest';
  statusSinceMs: number;
  message?: string;
  pinnedNoteIds: string[];
  pinnedPrimaryId: string;
  pinnedRecordId?: string | null;
}

const world = useWorldStore();
const music = useMusicStore();
const fragments = useFragmentsStore();
const timer = useTimerStore();
const audio = useAudioEngine();
const auth = useAuthStore();

const nowMs = ref(Date.now());
let nowHandle: number | null = null;

onMounted(() => {
  auth.init();
  void world.connect();
  nowHandle = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  world.disconnect();
  if (nowHandle != null) window.clearInterval(nowHandle);
  stopPinnedPlayback();
});

const formatStatusText = computed(() => {
  return (u: { status: 'focus' | 'rest'; statusSinceMs: number }): string => {
    if (u.status === 'rest') return '休息中';
    const diffMin = Math.floor((nowMs.value - u.statusSinceMs) / 60000);
    const timeText = diffMin <= 0 ? '剛剛' : `${diffMin} 分鐘`;
    return `專注中 · ${timeText}`;
  };
});

function colorForNoteId(id: string): string {
  return getFragmentById(id)?.color ?? '#acd7ff';
}

const selfPinnedNoteIds = computed(() => {
  if (music.pinnedRecord) return music.pinnedRecord.noteIds;
  if (fragments.unlockedNoteIds.length) return fragments.unlockedNoteIds.slice(0, 3);
  return ['dawn', 'mint'];
});

const selfPrimaryId = computed(() => selfPinnedNoteIds.value[0] ?? 'dawn');

const onlineUsers = computed<DisplayUser[]>(() => {
  const list: DisplayUser[] = [];

  if (auth.uid) {
    const pinnedRecordId = music.pinnedRecord?.id ?? null;
    list.push({
      id: auth.uid,
      name: auth.displayName,
      isSelf: true,
      status: timer.status === 'running' ? 'focus' : 'rest',
      statusSinceMs: timer.status === 'running' ? Date.now() - timer.elapsedMs : Date.now(),
      message: auth.profile.message?.trim() ?? '',
      pinnedNoteIds: selfPinnedNoteIds.value,
      pinnedPrimaryId: selfPrimaryId.value,
      pinnedRecordId,
    });
  }

  for (const u of world.others) {
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

async function togglePinnedForUser(u: DisplayUser) {
  // 若無 MP3 且非合成模式則不動作（防呆）
  if (!u.pinnedRecordId && u.pinnedNoteIds.length === 0) return;

  if (playingUserId.value === u.id) {
    stopPinnedPlayback();
    return;
  }

  stopPinnedPlayback();

  if (u.pinnedRecordId) {
    const ok = await music.ensureRecordMp3(u.pinnedRecordId).catch(() => false);
    if (ok) {
      const url = await music.getRecordMp3ObjectUrl(u.pinnedRecordId);
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

  // 退路處理
  playingUserId.value = u.id;
  await audio.playRecordByNoteIds(u.pinnedNoteIds).catch(() => {});
  playingUserId.value = null;
}
</script>

<template>
  <section class="bg-[#F0F0F0] px-4 py-4 md:px-6">
    <header class="mb-6 flex items-start justify-between">
      <h3 class="mt-2 text-[#999]">
        在線人數： <span class="text-[#666]">{{ onlineUsers.length }}</span> 人
      </h3>
    </header>

    <div class="flex flex-col gap-4">
      <div
        v-for="u in onlineUsers"
        :key="u.id"
        class="group relative flex items-center justify-between rounded-2xl border border-gray-50 bg-white p-4 md:rounded-3xl md:p-6"
      >
        <div class="flex items-center gap-3 md:gap-5">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full text-[#9ca3af] md:h-14 md:w-14"
            :style="{ background: u.pinnedPrimaryId ? colorForNoteId(u.pinnedPrimaryId) + '22' : '#f0f2f5' }"
          >
            <User class="h-5 w-5 md:h-7 md:w-7" />
          </div>

          <div class="min-w-0 flex-1">
            <span class="text-md truncate font-bold text-[#4a4a4a] md:text-lg">{{ u.name }}</span>
            <div class="mt-0.5 text-sm text-[#888]">
              <p>{{ formatStatusText(u) }}</p>
              <p class="truncate">{{ u.message }}</p>
            </div>
          </div>
        </div>

        <PlayStopButton
          class="border-2 border-slate-500 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100"
          :size="50"
          :is-playing="playingUserId === u.id"
          :disabled="!u.pinnedRecordId"
          :aria-label="u.pinnedRecordId ? '播放音樂' : '無置頂音樂'"
          @click="togglePinnedForUser(u)"
        />
      </div>

      <div v-show="onlineUsers.length === 0" class="flex flex-col items-center py-20 text-[#bbb]">
        <p>目前無法查看，先去登入吧！</p>
      </div>
    </div>
  </section>
</template>
