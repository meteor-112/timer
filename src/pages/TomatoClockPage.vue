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
    label: 'Sound Fragments',
    icon: Sparkles,
    component: FragmentsPanel,
    iconColor: 'text-amber-500', // 琥珀金
  },
  {
    key: 'music',
    label: 'Music Workshop',
    icon: CassetteTape,
    component: MusicStudioPanel,
    iconColor: 'text-indigo-500', // 靛藍
  },
  {
    key: 'world',
    label: 'World',
    icon: Globe,
    component: WorldRoomPanel,
    iconColor: 'text-emerald-500', // 翡翠綠
  },
  {
    key: 'profile',
    label: 'MyPage',
    icon: User,
    component: ProfilePanel,
    iconColor: 'text-rose-500', // 玫瑰紅
  },
  {
    key: 'info',
    label: 'Information',
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
    toast.value = { text: `Fragment Acquired:${label}`, at: Date.now() };

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
      <h1 class="font-display text-lg font-semibold tracking-tight md:text-xl">Sound Collector</h1>
      <p class="sm:text-md mt-0.5 text-sm">Gather sound fragments and craft your own melodies.</p>
    </header>

    <main class="relative z-10 flex flex-1 items-center justify-center px-6 pt-4 md:pt-0">
      <TimerCard />
    </main>

    <button
      type="button"
      @click="isPlayerOpen = true"
      class="fixed bottom-6 left-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-white shadow-lg transition-transform active:scale-95 lg:hidden"
      :class="{ 'pointer-events-none opacity-0': isPlayerOpen }"
    >
      <Music class="h-6 w-6" />
    </button>

    <!-- Desktop Player -->
    <div class="fixed bottom-6 left-6 z-40 hidden lg:flex">
      <PlayerBar />
    </div>

    <!-- 功能面板按鈕區 -->
    <div
      class="fixed top-1/2 right-2 z-40 flex -translate-y-1/2 flex-col gap-3 sm:right-6"
      role="group"
      aria-label="Menu"
    >
      <button
        v-for="item in navItems"
        :key="`nav-${item.key}`"
        type="button"
        @click="openPanel(item.key)"
        class="focus:ring-highlight flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-slate-600 bg-white/70 backdrop-blur-sm transition-all hover:bg-white/50 active:scale-95 md:h-20 md:w-20"
        :title="item.label"
        :aria-label="`Open${item.label}`"
      >
        <component :is="item.icon" :class="['h-5 w-5 md:h-10 md:w-10', item.iconColor]" />
      </button>
    </div>

    <Teleport to="body">
      <!-- Player (Mobile) -->
      <!-- Overlay -->
      <Transition name="fade">
        <div
          v-if="isPlayerOpen"
          class="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] lg:hidden"
          @click="isPlayerOpen = false"
        />
      </Transition>

      <!-- Player Panel -->
      <Transition name="slide-left">
        <div v-show="isPlayerOpen" class="fixed bottom-10 left-[18px] z-60 flex flex-col gap-2 sm:left-8 lg:hidden">
          <!-- 關閉 -->
          <button
            @click="isPlayerOpen = false"
            class="self-end rounded-full bg-slate-800/50 p-1.5 text-slate-300 active:bg-slate-800"
          >
            <X class="h-5 w-5" />
          </button>
          <PlayerBar />
        </div>
      </Transition>

      <!-- Drawer -->
      <!-- Overlay -->
      <Transition name="fade">
        <div v-if="drawerOpen" class="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" @click="drawerOpen = false" />
      </Transition>

      <!-- Panel -->
      <Transition name="slide-right">
        <aside
          class="fixed top-0 right-0 z-60 h-dvh w-[92vw] max-w-[700px] transition-transform duration-300"
          :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
          aria-label="Side Panel"
        >
          <div class="card flex h-full flex-col overflow-hidden">
            <section class="border-theme flex items-center justify-between gap-3 border-b px-3.5 py-3 sm:px-5 sm:py-4">
              <h2 class="text-lg sm:text-xl">{{ currentTabInfo?.label }}</h2>
              <button
                type="button"
                @click="drawerOpen = false"
                class="cursor-pointer rounded-full p-1.5 hover:bg-black/5"
                aria-label="Close Panel"
              >
                <X class="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            </section>

            <div class="flex-1 overflow-y-auto">
              <KeepAlive>
                <component :is="currentPanelComponent" />
              </KeepAlive>
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="slide-up">
      <div
        v-show="toast"
        class="fixed top-1/3 left-1/2 z-70 -translate-x-1/2 rounded-3xl bg-slate-800 px-5.5 py-2 text-center font-bold text-white shadow-lg"
      >
        {{ toast?.text }}
      </div>
    </Transition>
  </div>
</template>
<style>
/* fade */
.fade-enter-active {
  transition: opacity 0.3s ease-out;
}
.fade-leave-active {
  transition: opacity 0.2s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  display: block;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* slide-left */
.slide-left-enter-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}
.slide-left-leave-active {
  transition:
    transform 0.2s ease-in,
    opacity 0.2s ease-in;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
.slide-left-enter-to,
.slide-left-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* slide-right */
.slide-right-enter-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}
.slide-right-leave-active {
  transition:
    transform 0.2s ease-in,
    opacity 0.2s ease-in;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
.slide-right-enter-to,
.slide-right-leave-from {
  transform: translateX(0);
}

/* slide-up */
.slide-up-enter-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}
.slide-up-leave-active {
  transition:
    transform 0.2s ease-in,
    opacity 0.2s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.slide-up-enter-to,
.slide-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
