<script setup lang="ts">
import { ref, watch } from 'vue';
import TimerCard from '@/components/TimerCard.vue';
import FragmentsPanel from '@/components/FragmentsPanel.vue';
import MusicStudioPanel from '@/components/MusicStudioPanel.vue';
import WorldRoomPanel from '@/components/WorldRoomPanel.vue';
import PlayerBar from '@/components/PlayerBar.vue';
import { useFragmentsStore } from '@/stores/fragments';

// 圖標組件按需引入
import { Sparkles, Music, Globe } from 'lucide-vue-next';

type TabKey = 'fragments' | 'music' | 'world';
const tab = ref<TabKey>('fragments');
const drawerOpen = ref(false);
const fragments = useFragmentsStore();

const toast = ref<{ text: string; at: number } | null>(null);

watch(
  () => fragments.lastCollected?.collectedAt,
  () => {
    if (!fragments.lastCollected) return;
    const label = fragments.getFragmentLabel(fragments.lastCollected.fragmentId);
    toast.value = { text: `獲得碎片：${label}（+1）`, at: Date.now() };
    window.setTimeout(() => {
      // 避免覆蓋後又被新 toast 更新
      if (toast.value && Date.now() - toast.value.at > 2800) toast.value = null;
    }, 3000);
  },
);

function openPanel(next: TabKey) {
  tab.value = next;
  drawerOpen.value = true;
}
</script>

<template>
  <!-- 主容器 -->
  <div class="bg-background relative flex min-h-screen flex-col overflow-hidden">
    <!-- 頁首 -->
    <header class="relative z-10 px-6 pt-6 pb-2">
      <h1 class="font-display text-xl font-semibold tracking-tight">專注時光</h1>
      <p class="text-muted-foreground mt-0.5 text-xs">收集聲音碎片，創造屬於你的音樂</p>
    </header>
    <!-- 主畫面 -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-6">
      <TimerCard />
    </main>

    <!-- 左下角播放器 -->
    <div class="fixed bottom-6 left-6 z-40">
      <PlayerBar />
    </div>
    <!-- 功能面板 -->
    <div class="fixed top-1/2 right-4 z-40 flex -translate-y-1/2 flex-col gap-3" role="group" aria-label="功能選單">
      <!-- 倉庫 -->
      <button
        @click="openPanel('fragments')"
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform hover:scale-110 focus:ring-2"
        title="聲音碎片"
        aria-label="開啟聲音碎片面板"
      >
        <Sparkles class="text-highlight-foreground h-5 w-5" />
      </button>
      <!-- 音樂工坊 -->
      <button
        @click="openPanel('music')"
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform outline-none hover:scale-110 focus:ring-2"
        title="音樂工坊"
        aria-label="開啟音樂工坊"
      >
        <Music class="text-foreground h-5 w-5" />
      </button>
      <!-- 世界房間 -->
      <button
        @click="openPanel('world')"
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform outline-none hover:scale-110 focus:ring-2"
        title="世界房間 "
        aria-label="進入世界房間"
      >
        <Globe class="text-foreground h-5 w-5" />
      </button>
    </div>

    <Teleport to="body">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" @click="drawerOpen = false" />
      <aside
        class="fixed top-0 right-0 z-50 h-dvh w-[92vw] max-w-[560px] transition-transform duration-200"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        aria-label="右側面板"
      >
        <div class="h-full p-5">
          <div class="card h-full overflow-hidden rounded-[26px]">
            <div class="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
              <div>
                <div class="text-2xl font-semibold" style="color: var(--text)">
                  {{ tab === 'fragments' ? '聲音碎片' : tab === 'music' ? '音樂工坊' : '世界房間' }}
                </div>
              </div>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-full"
                style="background: rgba(79, 93, 93, 0.08); border: 1px solid rgba(79, 93, 93, 0.18)"
                aria-label="關閉面板"
                @click="drawerOpen = false"
              >
                ✕
              </button>
            </div>

            <div class="h-[calc(100%-80px)] overflow-y-auto px-6 pb-6">
              <FragmentsPanel v-if="tab === 'fragments'" />
              <MusicStudioPanel v-else-if="tab === 'music'" />
              <WorldRoomPanel v-else />
            </div>
          </div>
        </div>
      </aside>
    </Teleport>
  </div>
</template>
