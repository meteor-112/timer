<script setup lang="ts">
import { ref, watch, computed, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import { CassetteTape, Sparkles, Music, Globe, X, Info, User } from 'lucide-vue-next';

// 組件引入
import TimerCard from '@/components/TimerCard.vue';
import FragmentsPanel from '@/components/FragmentsPanel.vue';
import MusicStudioPanel from '@/components/MusicStudioPanel.vue';
import InfoPage from '@/components/InfoPage.vue';
import WorldRoomPanel from '@/components/WorldRoomPanel.vue';
import ProfilePanel from '@/components/ProfilePanel.vue';
import PlayerBar from '@/components/PlayerBar.vue';
import { useFragmentsStore } from '@/stores/fragments';

// --- 型別與配置 ---
type TabKey = 'fragments' | 'music' | 'world' | 'profile' | 'info';

interface NavItem {
  key: TabKey;
  label: string;
  icon: any;
  component: any;
  iconColor: string;
}

// 使用 shallowRef 優化性能
const navItems: NavItem[] = [
  {
    key: 'fragments',
    label: '聲音碎片',
    icon: Sparkles,
    component: FragmentsPanel,
    iconColor: 'text-amber-500', // 琥珀金
  },
  {
    key: 'music',
    label: '音樂工坊',
    icon: CassetteTape,
    component: MusicStudioPanel,
    iconColor: 'text-indigo-500', // 靛藍
  },
  {
    key: 'world',
    label: '世界',
    icon: Globe,
    component: WorldRoomPanel,
    iconColor: 'text-emerald-500', // 翡翠綠
  },
  {
    key: 'profile',
    label: '個人',
    icon: User,
    component: ProfilePanel,
    iconColor: 'text-rose-500', // 玫瑰紅
  },
  {
    key: 'info',
    label: '資訊',
    icon: Info,
    component: InfoPage,
    iconColor: 'text-slate-500', // 板岩灰
  },
];

// --- 響應式狀態 ---
const tab = ref<TabKey>('fragments');
const drawerOpen = ref(false);
const isPlayerOpen = ref(false);
const fragmentsStore = useFragmentsStore();

const toast = ref<{ text: string; at: number } | null>(null);
let toastTimer: number | null = null;

// --- 計算屬性 ---
const currentTabInfo = computed(() => navItems.find((i) => i.key === tab.value));
const currentPanelComponent = computed(() => currentTabInfo.value?.component);

// --- 邏輯函數 ---
function openPanel(next: TabKey) {
  tab.value = next;
  drawerOpen.value = true;
}

/**
 * 處理獲得碎片的通知邏輯
 */
watch(
  () => fragmentsStore.lastCollected?.collectedAt,
  (newVal) => {
    if (!newVal || !fragmentsStore.lastCollected) return;

    const label = fragmentsStore.getFragmentLabel(fragmentsStore.lastCollected.fragmentId);
    toast.value = { text: `獲得碎片：${label}（+1）`, at: Date.now() };

    // 清除舊計時器
    if (toastTimer) clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.value = null;
      toastTimer = null;
    }, 3000);
  },
);
</script>

<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden bg-[#E0E1DD]">
    <header class="absolute z-10 px-6 pt-6 pb-2">
      <h1 class="font-display text-lg font-semibold tracking-tight md:text-xl">專注時光</h1>
      <p class="text-muted-foreground mt-0.5 text-sm">收集聲音碎片，創造屬於你的音樂</p>
    </header>

    <main class="relative z-10 flex flex-1 items-center justify-center px-6 pt-4 md:pt-0">
      <TimerCard />
    </main>

    <button
      type="button"
      @click="isPlayerOpen = true"
      class="fixed bottom-6 left-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-white shadow-lg transition-all active:scale-95 lg:hidden"
      :class="{ 'pointer-events-none opacity-0': isPlayerOpen }"
    >
      <Music class="h-6 w-6" />
    </button>

    <div class="fixed bottom-6 left-6 z-40 hidden lg:flex">
      <PlayerBar />
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isPlayerOpen"
          @click="isPlayerOpen = false"
          class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm lg:hidden"
        />
      </Transition>

      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-full"
      >
        <div v-if="isPlayerOpen" class="fixed bottom-6 left-6 z-50 flex flex-col gap-2 lg:hidden">
          <button
            @click="isPlayerOpen = false"
            class="self-end rounded-full bg-slate-800/50 p-1.5 text-slate-300 active:bg-slate-800"
          >
            <X class="h-5 w-5" />
          </button>
          <PlayerBar />
        </div>
      </Transition>
    </Teleport>

    <div class="fixed top-1/2 right-4 z-40 flex -translate-y-1/2 flex-col gap-3" role="group" aria-label="功能選單">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        @click="openPanel(item.key)"
        class="focus:ring-highlight flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-slate-600 bg-white/70 backdrop-blur-sm transition-all hover:bg-white/50 active:scale-95 md:h-20 md:w-20"
        :title="item.label"
        :aria-label="`開啟${item.label}面板`"
      >
        <component :is="item.icon" :class="['h-5 w-5 md:h-8 md:w-8', item.iconColor]" />
      </button>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="drawerOpen" class="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" @click="drawerOpen = false" />
      </Transition>

      <aside
        class="fixed top-0 right-0 z-50 h-dvh w-[92vw] max-w-[700px] transition-transform duration-300 ease-in-out"
        :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
        aria-label="右側面板"
      >
        <div class="h-full p-5">
          <div class="card flex h-full flex-col overflow-hidden">
            <section class="border-theme flex items-center justify-between gap-3 border-b px-5 py-3">
              <h2 class="text-lg font-medium">{{ currentTabInfo?.label }}</h2>
              <button
                type="button"
                class="cursor-pointer rounded-full p-1 hover:bg-black/5"
                aria-label="關閉面板"
                @click="drawerOpen = false"
              >
                <X class="h-6 w-6" />
              </button>
            </section>

            <div class="flex-1 overflow-y-auto">
              <component :is="currentPanelComponent" v-if="drawerOpen" />
            </div>
          </div>
        </div>
      </aside>
    </Teleport>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toast"
        class="fixed top-10 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-sm text-white shadow-xl"
      >
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>
