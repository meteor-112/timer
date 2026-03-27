<script setup lang="ts">
import { ref, watch } from 'vue';
import TimerCard from '@/components/TimerCard.vue';
import FragmentsPanel from '@/components/FragmentsPanel.vue';
import MusicStudioPanel from '@/components/MusicStudioPanel.vue';
import WorldRoomPanel from '@/components/WorldRoomPanel.vue';
import PlayerBar from '@/components/PlayerBar.vue';
import { useFragmentsStore } from '@/stores/fragments';

// 圖標組件引入
import { Sparkles, Music, Globe, X } from 'lucide-vue-next';

// 定義面板切換的型別，確保 tab.value
type TabKey = 'fragments' | 'music' | 'world';

// --- 響應式狀態 (State) ---
const tab = ref<TabKey>('fragments'); // 當前激活的面板分頁
const drawerOpen = ref(false); // 控制側邊抽屜的顯示狀態
const fragments = useFragmentsStore(); // 引入 Pinia Store 管理碎片狀態

/** * Toast 通知狀態
 * text: 顯示文字, at: 建立時的時間戳記（用於判斷過期）
 */
const toast = ref<{ text: string; at: number } | null>(null);

/**
 * 監聽器：偵測碎片收集事件
 * 當 Store 中的 lastCollected 發生變化（代表使用者獲得新碎片）時觸發通知
 */
watch(
  () => fragments.lastCollected?.collectedAt,
  () => {
    if (!fragments.lastCollected) return;

    // 獲取碎片名稱並設定 Toast 內容
    const label = fragments.getFragmentLabel(fragments.lastCollected.fragmentId);
    toast.value = { text: `獲得碎片：${label}（+1）`, at: Date.now() };

    // 自動消失邏輯：3秒後清空 Toast
    window.setTimeout(() => {
      // 檢查機制：避免在 3 秒內若有更強的新通知進來，舊的計時器誤刪了新的通知
      if (toast.value && Date.now() - toast.value.at > 2800) {
        toast.value = null;
      }
    }, 3000);
  },
);

/**
 * 開啟面板函數
 * @param next - 目標分頁 Key
 */
function openPanel(next: TabKey) {
  tab.value = next;
  drawerOpen.value = true;
}
</script>

<template>
  <div class="bg-background relative flex min-h-screen flex-col overflow-hidden">
    <!-- 標題 -->
    <header class="relative z-10 px-6 pt-6 pb-2">
      <h1 class="font-display text-xl font-semibold tracking-tight">專注時光</h1>
      <p class="text-muted-foreground mt-0.5 text-xs">收集聲音碎片，創造屬於你的音樂</p>
    </header>
    <!-- 計時器 -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-6">
      <TimerCard />
    </main>
    <!-- 播放器 -->
    <div class="fixed bottom-6 left-6 z-40">
      <PlayerBar />
    </div>

    <!-- 功能面板 -->
    <div class="fixed top-1/2 right-4 z-40 flex -translate-y-1/2 flex-col gap-3" role="group" aria-label="功能選單">
      <button
        type="button"
        @click="openPanel('fragments')"
        class="focus:ring-highlight flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 transition-transform hover:scale-110"
        title="聲音碎片"
        aria-label="開啟聲音碎片面板"
      >
        <Sparkles class="h-5 w-5" />
      </button>

      <button
        type="button"
        @click="openPanel('music')"
        class="focus:ring-highlight flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 transition-transform hover:scale-110"
        title="音樂工坊"
        aria-label="開啟音樂工坊"
      >
        <Music class="h-5 w-5" />
      </button>

      <button
        type="button"
        @click="openPanel('world')"
        class="focus:ring-highlight flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 transition-transform hover:scale-110"
        title="世界房間 "
        aria-label="進入世界房間"
      >
        <Globe class="h-5 w-5" />
      </button>
    </div>

    <!-- 右側面板 -->
    <Teleport to="body">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" @click="drawerOpen = false" />

      <aside
        class="fixed top-0 right-0 z-50 h-dvh w-[92vw] max-w-[800px] transition-transform duration-200"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        aria-label="右側面板"
      >
        <div class="h-full p-5">
          <div class="card h-full overflow-hidden">
            <!-- 面板標題與關閉鈕 -->
            <section class="border-theme flex items-center justify-between gap-3 border-b px-5 py-1.5">
              <h2>
                {{ tab === 'fragments' ? '聲音碎片' : tab === 'music' ? '音樂工坊' : '世界房間' }}
              </h2>
              <button type="button" class="cursor-pointer" aria-label="關閉面板" @click="drawerOpen = false">
                <X class="hover:bg-theme/40" />
              </button>
            </section>
            <!-- 面板內容 -->
            <div class="h-[calc(100%-48px)] overflow-y-auto">
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
