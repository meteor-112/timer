<script setup>
import { RouterLink } from 'vue-router';
</script>
<template>
  <section class="bg-[#F0F0F0] p-8">
    <!-- 標題 -->
    <section class="mx-auto mb-8 max-w-2xl text-center">
      <h2 class="text-2xl font-bold text-[#4a4a4a] md:text-3xl">關於本站</h2>
      <p class="mt-2 text-[#999]">About & Credits</p>
    </section>

    <div class="mx-auto flex max-w-2xl flex-col gap-6">
      <!-- 製作者 -->
      <section class="rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 class="mb-2 flex items-center gap-2 text-lg font-bold text-[#4a4a4a]">
          <span class="text-[#7c73e6]">●</span> 製作者
        </h3>
        <a
          href="https://github.com/meteor-112"
          target="_blank"
          class="group flex items-center justify-between rounded-2xl bg-[#f0f2f5] p-4 transition-all hover:bg-[#e4e6e9]"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#9ca3af]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-[#4a4a4a]">meteor</p>
              <p class="text-sm text-[#999]">@meteor-112</p>
            </div>
          </div>
          <span class="text-[#bbb] transition-transform group-hover:translate-x-1">→</span>
        </a>
      </section>
      <!-- credits -->
      <section class="rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 class="mb-2 flex items-center gap-2 text-lg font-bold text-[#4a4a4a]">
          <span class="text-[#7c73e6]">●</span> 版權 (Credits)
        </h3>
        <p class="mb-1 font-bold tracking-wider text-[#999]">音樂來源</p>
        <a
          href="https://pixabay.com/sound-effects/"
          title="另開分頁"
          target="_blank"
          class="text-[#666] hover:text-[#7c73e6] hover:underline"
          >pixabay (sound-effects)</a
        >
      </section>
      <!-- privacy -->
      <section class="rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 class="mb-2 flex items-center gap-2 text-lg font-bold text-[#4a4a4a]">
          <span class="text-[#7c73e6]">●</span> 隱私權政策
        </h3>
        <p class="mb-3 text-[#999]">了解我們如何處理您的資訊</p>
        <RouterLink
          :to="{ path: '/privacy' }"
          target="_blank"
          class="mt-auto flex w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-gray-500 py-3 text-sm font-bold text-[#777] transition-all hover:bg-gray-500 hover:text-white"
        >
          查看政策詳情
        </RouterLink>
      </section>

      <footer class="py-2 text-center">
        <p class="text-sm text-[#bbb]">© 2026 Sound Collector. All rights reserved.</p>
      </footer>
    </div>
  </section>
</template>
