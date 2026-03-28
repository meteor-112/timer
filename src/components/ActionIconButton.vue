<script setup lang="ts">
import { computed, type Component } from 'vue';

// 定義支援的顏色變體類型
type ButtonVariant = 'stone' | 'emerald' | 'red' | 'none';
// 定義圖示尺寸類型
type IconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface Props {
  icon: Component; // 接收 Lucide 或其他組件
  variant?: ButtonVariant; // 可選，預設為 stone
  flex?: boolean; // 是否要佔滿剩餘空間
  customClass?: string; // 額外的樣式微調
  title?: string; // 懸停時顯示的文字提示
  iconSize?: IconSize;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'stone',
  flex: false,
  customClass: '',
  title: '',
  iconSize: 'md', // 預設為中等大小
});

defineEmits<{
  (e: 'click'): void;
}>();

// 顏色對照表
const variantStyles: Record<ButtonVariant, string> = {
  stone: 'bg-[#f0efee] text-stone-500',
  emerald: 'bg-green-200/70 text-emerald-600',
  red: 'bg-red-50 text-red-400',
  none: 'text-stone-600 hover:bg-stone-200',
};

// 尺寸對照表
const sizeClasses = computed(() => {
  const mapping: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };
  return mapping[props.iconSize] || mapping.md;
});

const buttonClasses = computed(() => {
  return [
    'flex items-center justify-center transition-all active:scale-95 cursor-pointer',
    variantStyles[props.variant],
    props.flex ? 'flex-1' : '',
    props.customClass,
  ];
});
</script>

<template>
  <button type="button" :class="buttonClasses" :title="title" @click="$emit('click')">
    <component :is="icon" :class="typeof iconSize === 'string' ? sizeClasses : ''" />
    <slot />
  </button>
</template>
<style scoped></style>
