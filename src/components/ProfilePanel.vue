<!-- 個人頁面 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useAlert';

// 確保 Store 類型推導正確
const auth = useAuthStore();
auth.init();

// 型別定義
// 初始化時：如果 auth.profile.name 是空的，預設顯示 '旅客'
const name = ref<string>(auth.profile.name || 'Traveler');
const message = ref<string>(auth.profile.message);

/**
 * 監聽 Store 變化並同步本地狀態
 */
watch(
  () => auth.profile,
  (p) => {
    name.value = p.name || 'Traveler';
    message.value = p.message;
  },
  { deep: true },
);

/**
 * 登入狀態標籤推導
 */
const kindLabel = computed((): string => {
  const mapping: Record<string, string> = {
    google: 'Sign in with Google',
    guest: 'Guest',
  };
  return mapping[auth.kind] || 'Not signed in';
});

/**
 * 保存個人資料
 */
async function handleSave(): Promise<void> {
  // 如果使用者把名字刪光了，自動填回「旅客」
  const finalName = name.value.trim() || 'Traveler';
  try {
    await auth.updateProfile({
      name: name.value.trim(),
      message: message.value.trim(),
    });
    // 如果之前是空的，把畫面上的值也同步修正
    name.value = finalName;
    toast.success('Saved');
  } catch (error) {
    toast.error('Save failed. Please try again later.');
  }
}
</script>

<template>
  <div class="space-y-4 px-6 pt-4 pb-8 sm:space-y-6 sm:px-8">
    <section class="mt-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="Identity Settings">
      <h3 class="mb-3 font-bold text-slate-800">
        Login Status:<br class="md:hidden" /><span class="font-medium text-[#666]">{{ kindLabel }}</span>
      </h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <template v-if="auth.kind !== 'google'">
          <BaseButton
            label="Continue as Guest"
            bg-color="bg-[#f0f2f5]"
            text-color="text-[#666]"
            class="transition-opacity hover:opacity-80"
            @click="auth.startAsGuest()"
          />
          <BaseButton
            label="Sign in with Google"
            class="transition-all hover:brightness-110"
            @click="auth.connectGoogle().catch(() => toast.error('Login cancelled or failed'))"
          />
        </template>
        <BaseButton
          v-if="auth.kind === 'google'"
          label="Sign Out"
          bg-color="bg-sky-600"
          shadow-color="0, 61, 122"
          class="transition-colors hover:bg-sky-700 md:col-start-2"
          @click="auth.logout().catch(() => {})"
        />
      </div>
    </section>

    <section class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h4 class="mb-3 font-semibold text-[#555]">Personal Profile</h4>

      <div class="flex flex-col gap-1">
        <label for="nickname" class="font-medium text-[#777]">Name</label>
        <input
          id="nickname"
          v-model="name"
          type="text"
          maxlength="8"
          placeholder="Enter name (max 8 characters)"
          aria-required="true"
          class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[#555] transition-all outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div class="mt-4 flex flex-col gap-1">
        <label for="user-message" class="font-medium text-[#777]">Message</label>
        <textarea
          id="user-message"
          v-model="message"
          maxlength="80"
          placeholder="Leave a short message"
          rows="3"
          class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2 text-[#555] transition-all outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div class="mt-4 flex items-center justify-end">
        <BaseButton label="Save Settings" class="transition-transform active:scale-95" @click="handleSave" />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 確保輸入框在 Focus 時有流暢的陰影過渡 */
input,
textarea {
  will-change: border-color, box-shadow;
}
</style>
