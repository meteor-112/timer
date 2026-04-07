<!-- 資訊頁 -->
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { StarIcon } from 'lucide-vue-next';
</script>
<template>
  <div class="flex min-h-full flex-col px-6 py-4 sm:p-8">
    <!-- 標題 -->
    <section class="mb-4 max-w-2xl text-center sm:mb-8">
      <h2 class="text-md font-bold text-[#4a4a4a] md:text-3xl md:text-lg">About & Credits</h2>
    </section>

    <div class="flex w-full max-w-2xl flex-1 flex-col gap-4 sm:gap-6">
      <!-- 製作者 -->
      <section
        class="rounded-[32px] border border-gray-50 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:px-8 md:py-6"
      >
        <h3 class="text-md mb-2 flex items-center gap-2 font-bold text-[#4a4a4a] md:text-lg">
          <span class="text-[#7c73e6]">●</span> Creator
        </h3>
        <a
          href="https://github.com/meteor-112"
          title="metoer's homepage(New tab)"
          target="_blank"
          class="group flex items-center justify-between rounded-2xl bg-[#f0f2f5] p-4 transition-all hover:bg-[#e4e6e9]"
        >
          <div class="flex flex-wrap items-center justify-center gap-2 md:gap-6">
            <StarIcon class="h-12 w-12 rounded-full bg-blue-400 p-2 text-white" />
            <div class="flex flex-col items-center md:items-start">
              <p class="font-bold text-[#4a4a4a]">meteor</p>
              <p class="text-sm text-[#999]">@meteor-112</p>
            </div>
          </div>
        </a>
      </section>
      <!-- credits -->
      <section
        class="rounded-[32px] border border-gray-50 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:px-8 md:py-6"
      >
        <h3 class="text-md mb-2 flex items-center gap-2 font-bold text-[#4a4a4a] md:text-lg">
          <span class="text-[#7c73e6]">●</span> Copyright
        </h3>
        <p class="md:text-md mb-1 px-1 text-sm font-bold tracking-wider text-[#999]">Audio Credits</p>
        <a
          href="https://pixabay.com/sound-effects/"
          title="pixabay(另開分頁)"
          target="_blank"
          class="md:text-md px-1 text-sm text-[#666] hover:text-[#7c73e6]"
          >pixabay (sound-effects)</a
        >
      </section>
      <!-- privacy -->
      <section
        class="rounded-[32px] border border-gray-50 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:px-8 md:py-6"
      >
        <h3 class="text-md mb-2 flex items-center gap-2 font-bold text-[#4a4a4a] md:text-lg">
          <span class="text-[#7c73e6]">●</span> Privacy Policy
        </h3>
        <p class="md:text-md mb-3 px-1 text-sm text-[#999]">Learn how we handle your information / See how your data is managed.</p>
        <RouterLink
          :to="{ path: '/privacy' }"
          target="_blank"
          class="mt-auto flex w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-gray-500 py-3 text-sm font-bold text-[#777] transition-all hover:bg-gray-500 hover:text-white"
        >
          View Details
        </RouterLink>
      </section>

      <p class="mt-auto text-center text-sm text-[#bbb]">
        © 2026 Sound Collector. <br class="sm:hidden" />All rights reserved.
      </p>
    </div>
  </div>
</template>
