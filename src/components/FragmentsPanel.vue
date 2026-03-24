<script setup lang="ts">
import { computed } from 'vue'
import { FRAGMENT_TYPES } from '@/data/audioCatalog'
import { useFragmentsStore } from '@/stores/fragments'

const fragments = useFragmentsStore()

const summaryText = computed(() => {
  const s = fragments.collectionSummary
  return `總收集 ${s.totalCollected} / 已解鎖 ${s.unlockedCount} 個音軌`
})

function pct(count: number): number {
  return Math.min(100, Math.floor((count / 4) * 100))
}
</script>

<template>
  <section class="card p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">聲音碎片系統</div>
        <div class="mt-1 text-lg font-semibold" style="color: var(--text)">收集進度</div>
        <div class="mt-1 text-sm" style="color: rgba(79, 93, 93, 0.78)">{{ summaryText }}</div>
      </div>
      <button
        class="px-3 py-2 rounded-xl text-sm"
        style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
        @click="fragments.resetAll"
      >
        清空
      </button>
    </div>

    <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="f in FRAGMENT_TYPES"
        :key="f.id"
        class="rounded-2xl p-3"
        style="background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(79, 93, 93, 0.10)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 rounded-full" :style="{ background: f.color, boxShadow: `0 0 16px ${f.color}55` }" />
            <div>
              <div class="font-semibold" style="color: var(--text)">{{ f.label }}</div>
              <div class="text-xs" style="color: rgba(79, 93, 93, 0.7)">碎片 x{{ fragments.getCount(f.id) }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs" style="color: rgba(79, 93, 93, 0.75)">進度</div>
            <div class="text-lg font-semibold" :style="{ color: f.color }">{{ pct(fragments.getCount(f.id)) }}%</div>
          </div>
        </div>

        <div class="mt-2 h-2 rounded-full" style="background: rgba(79, 93, 93, 0.08); overflow: hidden">
          <div class="h-full rounded-full" :style="{ width: `${pct(fragments.getCount(f.id))}%`, background: f.color, opacity: 0.8 }" />
        </div>

        <div class="mt-3 flex items-center justify-between gap-2">
          <div class="text-sm" style="color: rgba(79, 93, 93, 0.78)">
            <span v-if="fragments.getCount(f.id) >= 4" style="color: var(--green); font-weight: 700">已解鎖音軌</span>
            <span v-else>集齊 4 個解鎖</span>
          </div>

          <button
            class="px-3 py-2 rounded-xl text-sm"
            style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
            :disabled="fragments.getCount(f.id) < 4"
            @click="fragments.playUnlockedNote(f.id)"
          >
            聆聽
          </button>
        </div>
      </div>
    </div>

    <div v-if="fragments.lastCollected" class="mt-4 text-sm" style="color: rgba(79, 93, 93, 0.85)">
      最近一次：
      <span style="font-weight: 700">{{ fragments.getFragmentLabel(fragments.lastCollected.fragmentId) }}</span>（+1）
    </div>
  </section>
</template>

