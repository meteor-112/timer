<script setup lang="ts">
import { computed, type Component } from 'vue';

// 定義支援的顏色變體類型
type ButtonVariant = 'stone' | 'emerald' | 'red' | 'blue' | 'amber';

interface Props {
  icon: Component; // 接收 Lucide 或其他組件
  variant?: ButtonVariant; // 可選，預設為 stone
  flex?: boolean; // 是否要佔滿剩餘空間
  customClass?: string; // 額外的樣式微調
  title?: string; // 懸停時顯示的文字提示
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'stone',
  flex: false,
  customClass: '',
  title: '',
});

defineEmits<{
  (e: 'click'): void;
}>();

// 顏色對照表：方便未來無限擴充
const variantStyles: Record<ButtonVariant, string> = {
  stone: 'bg-[#f0efee] text-stone-500 hover:bg-[#E7E5E4]',
  emerald: 'bg-green-200/70 text-emerald-600',
  red: 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
};

const buttonClasses = computed(() => {
  return [
    'flex items-center justify-center rounded-xl px-3 py-2 transition-all active:scale-95 cursor-pointer',
    variantStyles[props.variant],
    props.flex ? 'flex-1' : '',
    props.customClass,
  ];
});
</script>

<template>
  <button type="button" :class="buttonClasses" :title="title" @click="$emit('click')">
    <component :is="icon" class="h-4 w-4" />
    <slot />
  </button>
</template>
<style scoped></style>
