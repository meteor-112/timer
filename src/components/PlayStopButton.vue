<script setup lang="ts">
import { Play, Square } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false,
  },
  // 新增：自訂大小 (預設 40px)
  size: {
    type: [Number, String],
    default: 40,
  },
  // 新增：自訂背景顏色 (預設原本的淺灰色)
  backgroundColor: {
    type: String,
    default: '#e9e8e8',
  },
});

defineEmits(['click']);

// 計算按鈕樣式
const buttonStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
  backgroundColor: props.backgroundColor,
}));

// 計算圖標大小 (按鈕的一半大小作為預設圖標比例)
const iconSize = computed(() => {
  const numSize = typeof props.size === 'number' ? props.size : parseInt(props.size);
  return numSize * 0.5;
});
</script>

<template>
  <button
    type="button"
    @click="$emit('click')"
    class="group flex cursor-pointer items-center justify-center rounded-3xl transition-colors hover:brightness-95"
    :style="buttonStyle"
  >
    <Square v-show="isPlaying" :size="iconSize" class="text-red-500" />
    <Play v-show="!isPlaying" :size="iconSize" class="text-stone-700" />

    <slot />
  </button>
</template>
