<script setup lang="ts">
import { computed } from 'vue';

type TransitionType = 'fade' | 'slide-right' | 'slide-left';

const props = defineProps({
  type: {
    type: String as () => TransitionType,
    default: 'fade',
  },
});

const transitions: Record<TransitionType, { enter: string; leave: string; active: string }> = {
  fade: {
    enter: 'opacity-0',
    leave: 'opacity-0',
    active: 'transition duration-300 ease-out',
  },
  'slide-right': {
    enter: 'opacity-0 translate-x-full',
    leave: 'opacity-0 translate-x-full',
    active: 'transition transform duration-300 ease-in-out',
  },
  'slide-left': {
    enter: 'opacity-0 -translate-x-full',
    leave: 'opacity-0 -translate-x-full',
    active: 'transition transform duration-300 ease-in-out',
  },
};

// 確保響應式
const config = computed(() => transitions[props.type]);
</script>

<template>
  <Transition
    :enter-active-class="config.active"
    :enter-from-class="config.enter"
    enter-to-class="opacity-100 translate-x-0"
    :leave-active-class="config.active"
    leave-from-class="opacity-100 translate-x-0"
    :leave-to-class="config.leave"
  >
    <slot />
  </Transition>
</template>