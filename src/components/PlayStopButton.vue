<!-- 播放鍵與停止鍵組件 -->
<script setup lang="ts">
import { Play, Square } from 'lucide-vue-next';

defineProps({
  isPlaying: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    @click="$emit('click')"
    class="group flex cursor-pointer items-center justify-center rounded-3xl bg-[#e9e8e8] p-2.5 hover:bg-[#e2e2e2]"
  >
    <Square v-show="isPlaying" class="h-5 w-5 text-red-500" />
    <Play v-show="!isPlaying" class="h-5 w-5 text-stone-700" />

    <slot />
  </button>
</template>

<style scoped></style>
