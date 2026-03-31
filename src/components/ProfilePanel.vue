<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useAlert'

const auth = useAuthStore()
auth.init()

const name = ref(auth.profile.name)
const message = ref(auth.profile.message)

watch(
  () => auth.profile,
  (p) => {
    name.value = p.name
    message.value = p.message
  },
  { deep: true },
)

const kindLabel = computed(() => (auth.kind === 'google' ? 'Google' : auth.kind === 'guest' ? '遊客' : '未登入'))

function save() {
  auth.updateProfile({ name: name.value, message: message.value })
  toast.success('已保存')
}
</script>

<template>
  <section class="min-h-screen bg-[#f8f9fa] px-6 py-4">
    <header class="mb-6">
      <h3 class="mt-2 text-sm font-medium text-[#999]">登入狀態：<span class="text-[#666]">{{ kindLabel }}</span></h3>
    </header>

    <div class="space-y-4">
      <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="mb-3 text-sm font-semibold text-[#555]">身份</div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl bg-[#f0f2f5] px-4 py-2 text-sm font-bold text-[#666] hover:bg-[#e4e6e9] active:scale-95"
            @click="auth.startAsGuest()"
          >
            以遊客身份開始
          </button>
          <button
            type="button"
            class="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900 active:scale-95"
            @click="auth.connectGoogle().catch(() => toast.success('登入被取消或失敗'))"
          >
            連結 Google 帳戶
          </button>
          <button
            v-if="auth.kind === 'google'"
            type="button"
            class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-[#666] hover:bg-gray-50 active:scale-95"
            @click="auth.logout().catch(() => {})"
          >
            登出
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="mb-3 text-sm font-semibold text-[#555]">個人資料</div>

        <label class="block text-sm font-medium text-[#777]">名字</label>
        <input
          v-model="name"
          type="text"
          maxlength="20"
          placeholder="想怎麼被大家看見？"
          class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-[#555] outline-none focus:border-slate-400"
        />

        <label class="mt-4 block text-sm font-medium text-[#777]">留言</label>
        <textarea
          v-model="message"
          maxlength="80"
          placeholder="留一句話（大家在世界房間會看到）"
          class="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-[#555] outline-none focus:border-slate-400"
          rows="3"
        />

        <div class="mt-4 flex items-center justify-end">
          <button
            type="button"
            class="rounded-xl bg-slate-800 px-5 py-2 text-sm font-bold text-white hover:bg-slate-900 active:scale-95"
            @click="save"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

