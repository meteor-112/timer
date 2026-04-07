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
  <div class="min-h-screen bg-[#E0E1DD] px-4 py-4 font-sans text-gray-800 antialiased sm:px-6 sm:py-10 lg:px-8">
    <div class="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">
      <header class="mb-4">
        <h1 class="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
        <div class="flex flex-col gap-2 text-sm text-slate-700">
          <p>Effective Date (Last Revised): {{ lastUpdated }}</p>
          <p>Operator: {{ operatorName }}</p>
        </div>
      </header>

      <div class="prose prose-slate max-w-none">
        <p class="leading-relaxed text-gray-600">
          "Sound Collector" (hereinafter referred to as "the Service") handles user information in accordance with the
          following policy.
        </p>

        <section class="mt-10">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">1. Information Collected</h2>
          <p class="mb-4">
            In order to provide relevant features, the Service collects and stores the following information:
          </p>

          <div class="space-y-6">
            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(1) Account & Identification Information</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>User Identifier (UID) issued by Firebase Authentication.</li>
                <li>(Optional) Email address, if using Email Link authentication.</li>
              </ul>
              <p class="mt-2 text-sm text-gray-500 italic">
                ※ Email addresses are used solely for login or account transfer procedures.
              </p>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(2) User Input & Settings</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>Profile details (Display name, status message, pinned music, etc.).</li>
                <li>Record production (Naming, editing, etc.).</li>
              </ul>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(3) Progress & Usage Data</h3>
              <ul class="ml-5 list-disc space-y-1">
                <li>Timer/Focus results (Focus duration, fragments collected, etc.).</li>
                <li>Number of fragments obtained and unlocked tracks.</li>
                <li>Created records.</li>
                <li>Background music playback history.</li>
                <li>Active room numbers.</li>
              </ul>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(4) Room Feature Information</h3>
              <p class="list-disc space-y-1">
                Information used for online presence and activity status within rooms (Focus status, duration, display
                name, avatar, messages, pinned records, etc.).
              </p>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(5) Local Storage Information</h3>
              <p>
                To enhance user convenience, progress such as fragment/track collection and finished records may be
                stored in the device's browser storage (localStorage).
              </p>
              <p class="mt-2 text-sm text-gray-500 italic">
                ※ Locally stored content can be deleted via browser settings (e.g., clearing browsing data).
              </p>
            </section>

            <section class="px-5">
              <h3 class="mb-2 text-lg font-bold">(6) Device & Access Information</h3>
              <p class="list-disc space-y-1">
                The system may automatically record Access Logs or error information as necessary for operational
                purposes.
              </p>
            </section>
          </div>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">2. Purpose of Use</h2>
          <ul class="flex list-disc flex-col gap-4 px-12">
            <li>Providing the Service (Data storage, synchronization, display, and functional execution).</li>
            <li>Providing Room features (Member management, online presence, and chat rooms).</li>
            <li>Preventing unauthorized use and ensuring security.</li>
            <li>Handling user inquiries and support.</li>
            <li>Error investigation and quality improvement.</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">3. Scope of Disclosure in Rooms</h2>
          <article class="mb-4 space-y-1 px-8">
            <p>Online status visibility within rooms is shared only among "users participating in the same room."</p>
            <p class="font-bold text-sky-600">
              Users are advised not to post personal or confidential information in chat rooms.
            </p>
          </article>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">4. Third-Party Services</h2>
          <p class="mb-4 px-8">To maintain operations, the Service utilizes the following external providers:</p>
          <ul class="list-disc px-12">
            <li>Firebase (Google LLC): Authentication, Database, and related features.</li>
            <li>Vercel: Website hosting.</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">5. Disclosure to Third Parties</h2>
          <p class="px-8 text-gray-600">
            Except as required by law, the Service will not provide personal data to third parties without the user's
            prior consent. The use of external services is a delegation based on Section 4, "Third-Party Services."
          </p>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">6. Data Retention</h2>
          <p class="px-8 text-gray-600">
            Collected information will be stored for the period necessary to provide the Service.
          </p>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">7. User Rights & Contact Information</h2>
          <div class="space-y-2 px-8">
            <p>For questions regarding data deletion or processing, please contact us via:</p>
            <div class="flex items-center">
              <span class="mr-2 font-bold">Contact Form:</span>
              <a
                target="_blank"
                href="https://docs.google.com/forms/d/e/1FAIpQLScwXi6L_ZENg7cala_Y1giJQtJNtuKmzSrnjdCHRdUIvBW8jQ/viewform?usp=publish-editor"
                title="google form"
                class="font-medium text-indigo-600 underline transition-colors hover:text-indigo-800"
              >
                [Click here]
              </a>
            </div>
            <p class="text-sm text-gray-500 italic">(Only provide contact details if a response is required.)</p>
            <p class="leading-relaxed">
              Users may request access to, correction of, deletion of, or suspension of the use of their personal data.
              We will process such requests within a reasonable scope after identity verification (generally free of
              charge). Information regarding the operator's location will be provided without delay upon request.
            </p>
          </div>
        </section>

        <section class="mt-12">
          <h2 class="mb-6 flex items-center text-2xl font-bold text-gray-900">8. Security Management</h2>
          <p class="mb-4 px-8">The Service implements reasonable security measures, including:</p>
          <ul class="list-disc px-12">
            <li>Encryption of communication (HTTPS).</li>
            <li>Access control via Firestore security rules.</li>
            <li>Least-privilege design.</li>
            <li>Anomaly detection via operational logs.</li>
          </ul>
        </section>

        <section class="mt-12">
          <h2 class="mb-4 text-2xl font-bold text-gray-900">9. Revisions</h2>
          <p class="px-8 text-gray-600">
            This policy may be revised as necessary. Revisions will be announced within the Service.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
