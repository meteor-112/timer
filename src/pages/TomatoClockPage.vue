<script setup lang="ts">
import { ref, watch } from 'vue';
import TimerCard from '@/components/TimerCard.vue';
import FragmentsPanel from '@/components/FragmentsPanel.vue';
import MusicStudioPanel from '@/components/MusicStudioPanel.vue';
import WorldRoomPanel from '@/components/WorldRoomPanel.vue';
import { useFragmentsStore } from '@/stores/fragments';

// 圖標組件按需引入
import { Sparkles, Music, Globe } from 'lucide-vue-next';

type TabKey = 'fragments' | 'music' | 'world';
const tab = ref<TabKey>('fragments');
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
</script>

<template>
  <!-- 主容器 -->
  <div class="bg-background relative flex min-h-screen flex-col overflow-hidden">
    <!-- 頁首 -->
    <header class="relative z-10 px-6 pt-6 pb-2">
      <h1 class="font-display text-xl font-semibold tracking-tight">專注時光</h1>
      <p class="text-muted-foreground mt-0.5 text-xs">收集聲音碎片，創造屬於你的音樂</p>
    </header>
    <!-- 居中顯示計時器  -->
    <main class="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-32">
      <TimerCard />
    </main>
    <!-- 功能面板 -->
    <div class="fixed top-1/2 right-4 z-40 flex -translate-y-1/2 flex-col gap-3" role="group" aria-label="功能選單">
      <!-- 倉庫 -->
      <button
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform hover:scale-110 focus:ring-2"
        title="聲音碎片"
        aria-label="開啟聲音碎片面板"
      >
        <Sparkles class="text-highlight-foreground h-5 w-5" />
      </button>
      <!-- 音樂工坊 -->
      <button
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform outline-none hover:scale-110 focus:ring-2"
        title="音樂工坊"
        aria-label="開啟音樂工坊"
      >
        <Music class="text-foreground h-5 w-5" />
      </button>
      <!-- 世界房間 -->
      <button
        class="glass-panel-highlight focus:ring-highlight flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform outline-none hover:scale-110 focus:ring-2"
        title="世界房間 "
        aria-label="進入世界房間"
      >
        <Globe class="text-foreground h-5 w-5" />
      </button>
    </div>
  </div>
</template>
