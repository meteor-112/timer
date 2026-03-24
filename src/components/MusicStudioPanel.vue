<script setup lang="ts">
import { computed, ref } from 'vue'
import { FRAGMENT_TYPES } from '@/data/audioCatalog'
import { useFragmentsStore } from '@/stores/fragments'
import { useMusicStore, type MusicRecord } from '@/stores/music'

const fragments = useFragmentsStore()
const music = useMusicStore()

const selectedNoteIds = ref<string[]>([])
const recordName = ref('')
const pinAfterCreate = ref(true)
const generating = ref(false)

const canCreate = computed(() => selectedNoteIds.value.length >= 1)

function isSelected(id: string) {
  return selectedNoteIds.value.includes(id)
}

function toggleSelected(id: string) {
  const idx = selectedNoteIds.value.indexOf(id)
  if (idx >= 0) selectedNoteIds.value.splice(idx, 1)
  else selectedNoteIds.value.push(id)
}

async function createRecord() {
  if (!canCreate.value) return
  generating.value = true
  try {
    const record = music.createRecord(selectedNoteIds.value, recordName.value)
    await music.ensureRecordMp3(record.id) // 製作完成後輸出 mp3
    selectedNoteIds.value = []
    recordName.value = ''
    if (pinAfterCreate.value) music.setPinned(record.id)
  } finally {
    generating.value = false
  }
}

const shareCode = ref('')
const importCode = ref('')

function startShare(recordId: string) {
  const code = music.shareRecord(recordId)
  shareCode.value = code ?? ''
}

async function doImport() {
  const code = importCode.value.trim()
  if (!code) return
  const record = music.importShareCode(code)
  if (record) {
    importCode.value = ''
    generating.value = true
    try {
      await music.ensureRecordMp3(record.id)
    } finally {
      generating.value = false
    }
    music.setPinned(record.id)
  }
}

async function copyShareCode() {
  const code = shareCode.value.trim()
  if (!code) return
  try {
    const nav = globalThis.navigator
    await nav.clipboard?.writeText(code)
  } catch {
    // ignore
  }
}

const editTargetId = ref<string | null>(null)
const editName = ref('')

function beginRename(record: MusicRecord) {
  editTargetId.value = record.id
  editName.value = record.name
}

function saveRename() {
  if (!editTargetId.value) return
  music.renameRecord(editTargetId.value, editName.value)
  editTargetId.value = null
}
</script>

<template>
  <section class="card p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">音樂系統</div>
        <div class="mt-1 text-lg font-semibold" style="color: var(--text)">30 秒唱片製作</div>
        <div class="mt-1 text-sm" style="color: rgba(79, 93, 93, 0.78)">
          只用「已解鎖的音軌（音符）」來組合。製作完成後會輸出並儲存唱片 mp3。
        </div>
      </div>
      <div class="accent-pill text-sm" style="color: var(--text)">
        <span class="inline-block h-2 w-2 rounded-full" style="background: var(--blue); box-shadow: 0 0 14px rgba(172, 215, 255, 0.65)" />
        <span>已解鎖音軌：{{ fragments.unlockedNoteIds.length }}</span>
      </div>
    </div>

    <div class="mt-4">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">選擇要放進唱片的音符</div>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="n in fragments.unlockedNoteIds"
          :key="n"
          class="px-3 py-2 rounded-xl text-sm"
          :style="{
            border: isSelected(n) ? `1px solid ${FRAGMENT_TYPES.find((f) => f.id === n)?.color ?? '#acd7ff'}55` : '1px solid rgba(79, 93, 93, 0.12)',
            background: isSelected(n) ? 'rgba(172, 215, 255, 0.18)' : 'rgba(255, 255, 255, 0.55)',
          }"
          @click="toggleSelected(n)"
        >
          {{ fragments.getFragmentLabel(n) }}
        </button>
        <div v-if="fragments.unlockedNoteIds.length === 0" class="text-sm" style="color: rgba(79, 93, 93, 0.7)">
          先在計時器開始：每 25 分鐘會隨機獲得碎片，集滿 4 個同類型就會解鎖音軌。
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-end justify-between gap-3 flex-wrap">
      <div>
        <label class="text-sm" style="color: rgba(79, 93, 93, 0.85)">唱片名稱</label>
        <input
          v-model="recordName"
          type="text"
          class="mt-1 w-80 max-w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
          placeholder="例如：綠色靜心 - 30 秒"
        />
      </div>

      <label class="text-sm flex items-center gap-2" style="color: rgba(79, 93, 93, 0.85)">
        <input type="checkbox" v-model="pinAfterCreate" />
        製作後自動置頂
      </label>

      <button
        class="px-4 py-2 rounded-xl"
        style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
        :disabled="!canCreate || generating"
        @click="createRecord"
      >
        {{ generating ? '正在輸出 mp3...' : '製作並儲存唱片' }}
      </button>
    </div>

    <div class="mt-4">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">你的唱片（可命名、分享、置頂）</div>
      <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="r in music.musicRecords"
          :key="r.id"
          class="rounded-2xl p-3"
          style="background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(79, 93, 93, 0.10)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-semibold" style="color: var(--text)">{{ r.name }}</div>
              <div class="text-xs" style="color: rgba(79, 93, 93, 0.7)">
                note 數：{{ r.noteIds.length }} · {{ new Date(r.createdAt).toLocaleString() }}
              </div>
              <div v-if="music.pinnedId === r.id" class="text-xs mt-1" style="color: var(--green); font-weight: 700">
                已置頂
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
                @click="music.playRecord(r.id)"
              >
                播放
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(156, 175, 170, 0.14); border: 1px solid rgba(156, 175, 170, 0.35)"
              @click="music.setPinned(music.pinnedId === r.id ? null : r.id)"
            >
              {{ music.pinnedId === r.id ? '取消置頂' : '置頂' }}
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="beginRename(r)"
            >
              改名
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(172, 215, 255, 0.08); border: 1px solid rgba(172, 215, 255, 0.25)"
              @click="startShare(r.id)"
            >
              分享
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="music.removeRecord(r.id)"
            >
              刪除
            </button>
          </div>

          <div v-if="editTargetId === r.id" class="mt-3">
            <input
              v-model="editName"
              type="text"
              class="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
            />
            <div class="mt-2 flex gap-2">
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
                @click="saveRename"
              >
                儲存改名
              </button>
              <button
                class="px-3 py-2 rounded-xl text-sm"
                style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
                @click="editTargetId = null"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <div v-if="music.musicRecords.length === 0" class="mt-3 text-sm" style="color: rgba(79, 93, 93, 0.7)">
          先選擇 1 個以上的音軌並製作，就會產生 30 秒唱片。
        </div>
      </div>
    </div>

    <div class="mt-5">
      <div class="text-sm font-medium" style="color: rgba(79, 93, 93, 0.85)">分享 / 匯入</div>
      <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div class="text-xs" style="color: rgba(79, 93, 93, 0.75)">目前分享碼（按下某張唱片的「分享」會自動填入）</div>
          <textarea
            v-model="shareCode"
            class="mt-1 w-full min-h-28 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
          />
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(172, 215, 255, 0.14); border: 1px solid rgba(172, 215, 255, 0.35)"
              :disabled="!shareCode.trim()"
              @click="copyShareCode"
            >
              複製分享碼
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="shareCode = ''"
            >
              清空
            </button>
          </div>
        </div>

        <div>
          <div class="text-xs" style="color: rgba(79, 93, 93, 0.75)">匯入分享碼（會產生新唱片並自動置頂）</div>
          <textarea
            v-model="importCode"
            class="mt-1 w-full min-h-28 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm"
            placeholder="貼上分享碼後按下匯入"
          />
          <div class="mt-2 flex gap-2">
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(151, 206, 80, 0.22); border: 1px solid rgba(151, 206, 80, 0.55)"
              :disabled="!importCode.trim()"
              @click="doImport"
            >
              匯入並置頂
            </button>
            <button
              class="px-3 py-2 rounded-xl text-sm"
              style="background: rgba(79, 93, 93, 0.06); border: 1px solid rgba(79, 93, 93, 0.18)"
              @click="importCode = ''"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

