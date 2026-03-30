<script setup lang="ts">
import { computed, type Component } from 'vue';

type ButtonVariant = 'stone' | 'emerald' | 'red' | 'none';
type IconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface Props {
  icon: Component;
  variant?: ButtonVariant;
  flex?: boolean;
  customClass?: string;
  title?: string;
  iconSize?: IconSize;
  disabled?: boolean; // 1. 新增 disabled 屬性
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'stone',
  flex: false,
  customClass: '',
  title: '',
  iconSize: 'md',
  disabled: false, // 預設為 false
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

// 處理點擊事件：如果禁用則不發送事件
const handleClick = () => {
  if (!props.disabled) {
    emit('click');
  }
};

const variantStyles: Record<ButtonVariant, string> = {
  stone: 'bg-[#f0efee] text-stone-500',
  emerald: 'bg-green-200/70 text-emerald-600',
  red: 'bg-red-50 text-red-400',
  none: 'text-stone-600 hover:bg-white',
};

const sizeClasses = computed(() => {
  const mapping: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };
  return mapping[props.iconSize as string] || mapping.md;
});

const buttonClasses = computed(() => {
  return [
    'flex items-center justify-center transition-all hover:brightness-95',
    // 2. 根據 disabled 狀態切換 Cursor 和縮放效果
    props.disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95 ',
    variantStyles[props.variant],
    props.flex ? 'flex-1' : '',
    props.customClass,
  ];
});
</script>

<template>
  <button type="button" :class="buttonClasses" :title="disabled ? '' : title" :disabled="disabled" @click="handleClick">
    <component :is="icon" :class="typeof iconSize === 'string' ? sizeClasses : ''" />
    <slot />
  </button>
</template>
