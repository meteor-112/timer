<template>
  <section class="min-h-screen bg-[#f8f9fa] px-6 py-8 md:py-12">
    <header class="mx-auto mb-10 max-w-2xl text-center">
      <h2 class="text-2xl font-bold text-[#4a4a4a] md:text-3xl">關於本站</h2>
      <p class="mt-2 text-[#999]">About & Credits</p>
    </header>

    <div class="mx-auto flex max-w-2xl flex-col gap-6">
      <div class="rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 class="mb-6 flex items-center gap-2 text-lg font-bold text-[#4a4a4a]">
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
      </div>

      <div class="rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 class="mb-6 flex items-center gap-2 text-lg font-bold text-[#4a4a4a]">
          <span class="text-[#7c73e6]">●</span> 鳴謝與版權 (Credits)
        </h3>

        <div class="space-y-6">
          <section>
            <h4 class="mb-3 text-sm font-bold tracking-wider text-[#999]">插畫 ILLUSTRATION</h4>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="https://x.com/meiro0_0Illust/"
                target="_blank"
                class="text-sm text-[#666] hover:text-[#7c73e6] hover:underline"
                >meiro (@meiro0_0Illust)</a
              >
              <a
                href="https://iconbu.com/"
                target="_blank"
                class="text-sm text-[#666] hover:text-[#7c73e6] hover:underline"
                >フリーペンシル (iconbu.com)</a
              >
            </div>
          </section>

          <section>
            <h4 class="mb-3 text-sm font-bold tracking-wider text-[#999]">音樂 BGM</h4>
            <a
              href="https://www.instagram.com/bgm.akira/"
              target="_blank"
              class="text-sm text-[#666] hover:text-[#7c73e6] hover:underline"
              >akira (@bgm.akira)</a
            >
          </section>

          <section>
            <h4 class="mb-3 text-sm font-bold tracking-wider text-[#999]">圖標 ICON</h4>
            <a
              href="https://icons8.com"
              target="_blank"
              class="text-sm text-[#666] hover:text-[#7c73e6] hover:underline"
              >Twitter(X) Icon by Icons8</a
            >
          </section>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          class="flex flex-col rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <h3 class="mb-2 text-lg font-bold text-[#4a4a4a]">意見回饋</h3>
          <p class="mb-6 text-xs text-[#999]">歡迎回報 Bug 或提供功能建議</p>
          <button
            class="mt-auto w-full rounded-2xl bg-[#7c73e6] py-3 text-sm font-bold text-white transition-all hover:bg-[#6b63d1] active:scale-95"
          >
            開啟聯繫表單
          </button>
        </div>

        <div
          class="flex flex-col rounded-[32px] border border-gray-50 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <h3 class="mb-2 text-lg font-bold text-[#4a4a4a]">隱私政策</h3>
          <p class="mb-6 text-xs text-[#999]">了解我們如何處理您的資訊</p>
          <button
            class="mt-auto w-full rounded-2xl border border-gray-200 py-3 text-sm font-bold text-[#777] transition-all hover:bg-gray-50 active:scale-95"
          >
            查看政策詳情
          </button>
        </div>
      </div>

      <footer class="py-10 text-center">
        <p class="text-xs text-[#bbb]">© {{ new Date().getFullYear() }} Focus App. All rights reserved.</p>
      </footer>
    </div>
  </section>
</template>
