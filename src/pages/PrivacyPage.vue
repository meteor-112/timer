<script setup lang="ts">
/**
 * PrivacyPolicy.vue
 * * 旅するタイマー - 隱私權政策頁面
 * 採用 Tailwind CSS 佈局，確保行動端與桌面端的閱讀體驗。
 */

interface Props {
  lastUpdated?: string;
  operatorName?: string;
}

// 定義 Props 預設值
withDefaults(defineProps<Props>(), {
  lastUpdated: '2026/04/02',
  operatorName: 'meteor',
});

// 若未來需要處理跳轉或外部連結，可在此定義 Emits
// const emit = defineEmits<{
//   (e: 'navigate', url: string): void
// }>();
</script>

<template>
  <div class="min-h-screen bg-[#E0E1DD] px-4 py-10 font-sans text-gray-800 antialiased sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
      <header class="mb-4">
        <h1 class="mb-4 text-3xl font-bold tracking-tight md:text-4xl">隱私權政策</h1>
        <div class="flex flex-col gap-2 text-sm text-slate-700">
          <p>制定日期（最終修訂日）：{{ lastUpdated }}</p>
          <p>營運者：{{ operatorName }}</p>
        </div>
      </header>

      <div class="prose prose-slate max-w-none">
        <p class="leading-relaxed text-gray-600">
          「拾音匠 Sound Collector」（以下簡稱「本服務」）將依照以下方針處理使用者的資訊。
        </p>

        <section class="mt-10">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">1. 收集的資訊</h2>
          <p class="mb-4">為了提供相關功能，本服務將收集並儲存以下資訊：</p>

          <div class="space-y-6">
            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(1) 帳號與識別資訊</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>由 Firebase Authentication 核發的使用者識別碼 (UID)。</li>
                <li>（選填）若使用電子郵件連結驗證：電子郵件地址。</li>
              </ul>
              <p class="mt-2 text-sm text-gray-500 italic">※ 電子郵件地址僅用於登入或帳號轉移程序。</p>
            </section>
            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(2) 使用者輸入與設定之資訊</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>個人資料（顯示名稱、留言、置頂音樂等）。</li>
                <li>唱片制作(命名、編輯等)</li>
              </ul>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(3) 進度與使用狀況相關資訊</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>計時器/專注結果（專注時間、碎片蒐集等）</li>
                <li>已獲得的碎片數量、已解鎖的音軌</li>
                <li>已製作的唱片</li>
                <li>背景音樂播放</li>
                <li>參與中的房間號</li>
              </ul>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(4) 房間功能相關資訊</h3>
              <p class="list-disc space-y-1">
                用於房間內在線顯示與活動狀態之資訊（專注狀態、專注時長、顯示名稱、頭像、留言、置頂唱片等）。
              </p>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(5) 儲存於裝置內的資訊</h3>
              <p>為提升便利性，碎片與音軌蒐集進度、唱片成品等可能會儲存於裝置的瀏覽器儲存空間 (localStorage)。</p>
              <p class="mt-2 text-sm text-gray-500 italic">
                ※ 裝置內的儲存內容可透過瀏覽器設定（清除瀏覽資料等）進行刪除。
              </p>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(6) 裝置與存取相關資訊</h3>
              <p class="list-disc space-y-1">
                在營運必要的範圍內，系統可能會自動記錄存取日誌 (Access Logs) 或錯誤資訊。
              </p>
            </section>
          </div>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">2. 利用目的</h2>
          <ul class="flex list-disc flex-col gap-4 px-12">
            <li class="">提供本服務（資料儲存、同步、顯示、功能執行）。</li>
            <li class="">提供房間功能（成員管理、在線顯示、聊天室）。</li>
            <li class="">防止非法使用、確保安全性。</li>
            <li class="">處理使用者聯絡諮詢。</li>
            <li class="">調查錯誤與改善品質。</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">3. 房間內顯示之公開範圍</h2>
          <article class="mb-4 space-y-1 px-8">
            <p>房間內的在線顯示，僅限於「參加同一房間的使用者」可閱覽之範圍內共享。</p>
            <p class="font-bold text-sky-600">使用者請注意，切勿在聊天室中投稿個人資訊或機密資訊。</p>
          </article>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">4. 外部服務之利用</h2>
          <p class="mb-4 px-8">為維持營運，本服務使用以下外部服務：</p>
          <ul class="list-disc px-12">
            <li>Firebase (Google LLC)：驗證、資料庫、相關功能</li>
            <li>Vercel：網站託管</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">5. 提供予第三方</h2>
          <p class="px-8 text-gray-600">
            除法律規定外，本服務在未經本人同意前，不會將個人資料提供給第三方。此外，利用外部服務屬於基於「4.
            外部服務之利用」所進行之委託。
          </p>
        </section>
        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">6. 儲存期限</h2>
          <p class="px-8 text-gray-600">收集到的資訊將在本服務提供之必要期間內儲存</p>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">7. 使用者刪除權利與聯絡窗口</h2>
          <div class="space-y-2 px-8">
            <p>關於資料刪除或處理相關疑問，請透過以下窗口聯繫：</p>
            <div class="flex items-center">
              <span class="mr-2 font-bold">聯絡表單：</span>
              <a href="#" class="font-medium text-indigo-600 underline transition-colors hover:text-indigo-800">
                [按此前往]
              </a>
            </div>
            <p class="text-sm text-gray-500 italic">（僅在需要回覆時填寫聯絡方式即可）</p>
            <p class="leading-relaxed">
              使用者可要求公開、更正、刪除或停止利用個人資料。我們將在確認身份後，於合理範圍內處理（原則上不收取手續費）。關於營運者所在地等資訊，將在收到請求時，毫不遲延地予以回覆。
            </p>
          </div>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">8. 安全管理</h2>
          <p class="mb-4 px-8">本服務採取合理的安全對策，包括：</p>
          <ul class="list-disc px-12">
            <li>通訊加密保護 (HTTPS)</li>
            <li>Firestore 安全規則存取控制</li>
            <li>最小限度權限設計</li>
            <li>異常偵測日誌運用</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">9. 修訂</h2>
          <p class="px-8 text-gray-600">本政策將視需要進行修訂。修訂後將於本服務上公告。</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
