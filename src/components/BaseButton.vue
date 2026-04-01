<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label?: string;
  bgColor?: string; // e.g., 'bg-stone-800'
  textColor?: string; // e.g., 'text-white'
  shadowColor?: string; // e.g., '168, 162, 158'
  showIcon?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '加入音軌',
  bgColor: 'bg-stone-800',
  textColor: 'text-white',
  shadowColor: '168, 162, 158',
  showIcon: false,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// 使用 CSS Variables 處理陰影，這樣 active:shadow-none 才能正常運作
const customVars = computed(() => ({
  '--btn-shadow-color': `rgb(${props.shadowColor})`,
}));

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) emit('click', event);
};
</script>

<template>
  <button
    :disabled="disabled"
    @click="handleClick"
    type="button"
    :aria-label="label"
    :style="customVars"
    class="custom-btn flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition-all active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
    :class="[bgColor, textColor, 'hover:brightness-95']"
  >
    <slot name="icon"> </slot>

    <slot>
      <span>{{ label }}</span>
    </slot>
  </button>
</template>

<style scoped>
.custom-btn {
  /* 使用初始化定義的變數，確保與 Tailwind 的 active 類別不衝突 */
  box-shadow: 0 4px 0 var(--btn-shadow-color);
}

.custom-btn:active {
  /* 強制在 active 時移除陰影，對應 active:shadow-none */
  box-shadow: 0 0 0 transparent;
}

.custom-btn:disabled {
  box-shadow: none;
}
</style>
