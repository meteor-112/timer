//音訊碎片收集系統(儲存/抽取/解鎖機制)
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog';
import { useAudioEngine } from '@/composables/useAudioEngine';

/**
 * 型別定義：以碎片 ID 為鍵，收集次數為值的物件
 */
type FragmentCounts = Record<string, number>;

//本地存儲的 Key 值，用於瀏覽器重整後仍能保留進度
const STORAGE_KEY = 'timer_fragments_v1';

/**
 * 私有輔助函式：從 LocalStorage 載入資料
 * @returns {FragmentCounts} 返回已存儲的計數物件或空物件
 */
function loadCounts(): FragmentCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FragmentCounts;
    return parsed ?? {}; // 使用 ?? 確保回傳值至少是空物件，避免 null 導致後續報錯
  } catch {
    return {}; // 若 JSON 解析失敗（資料損壞），回傳空物件重置
  }
}

/**
 * 私有輔助函式：將資料寫入 LocalStorage
 * @param counts 當前的碎片計數狀態
 */
function persistCounts(counts: FragmentCounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore
  }
}

export const useFragmentsStore = defineStore('fragments', () => {
  // --- 狀態 (State) ---

  //儲存所有碎片的收集數量
  const counts = ref<FragmentCounts>(loadCounts());

  // 紀錄最近一次獲得的碎片，用於觸發 Toast 或動畫特效
  const lastCollected = ref<{ fragmentId: string; collectedAt: number } | null>(null);

  // --- 計算屬性 (Getters) ---

  /**
   * 格式化後的顯示列表
   * 包含解鎖狀態 (isUnlocked: 滿 4 個) 與 發現狀態 (isDiscovered: 至少 1 個)
   */
  const displayList = computed(() => {
    return FRAGMENT_TYPES.map((f) => {
      const count = counts.value[f.id] ?? 0;
      return {
        ...f,
        count,
        isUnlocked: count >= 4, //解鎖
        isDiscovered: count >= 1, //發現
      };
    });
  });

  /**
   * 快速查詢表：根據 ID 映射進度 (例如用於進度條)
   */
  const progressById = computed(() => {
    const result: Record<string, number> = {};
    for (const f of FRAGMENT_TYPES) {
      result[f.id] = counts.value[f.id] ?? 0;
    }
    return result;
  });

  //過濾出已解鎖的音軌 ID 列表
  const unlockedNoteIds = computed(() => {
    return FRAGMENT_TYPES.filter((f) => (counts.value[f.id] ?? 0) >= 4).map((f) => f.id);
  });

  /**
   * 收集進度摘要
   * totalCollected: 總獲得次數
   * unlockedCount: 已達成解鎖條件的種類數量
   */
  const collectionSummary = computed(() => {
    const totalCollected = Object.values(counts.value).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      totalCollected,
      unlockedCount: unlockedNoteIds.value.length,
    };
  });

  // --- 操作方法 (Actions) ---

  //取得特定碎片的收集數量
  function getCount(fragmentId: string): number {
    return counts.value[fragmentId] ?? 0;
  }

  /**
   * 增加指定碎片的數量並執行持久化
   * @param fragmentId 碎片唯一的識別 ID
   */
  async function collectFragment(fragmentId: string): Promise<void> {
    counts.value[fragmentId] = (counts.value[fragmentId] ?? 0) + 1;
    persistCounts(counts.value); // 存入 LocalStorage
    // 更新最後收集狀態，觸發 UI 監聽
    lastCollected.value = { fragmentId, collectedAt: Date.now() };
  }

  /** * 隨機抽取碎片
   * @returns 包含碎片 ID 與「是否為本次點擊觸發解鎖」的資訊
   */
  async function collectRandomFragment(): Promise<{ fragmentId: string; unlocked: boolean }> {
    // 從目錄中隨機挑選一個
    const randomIndex = Math.floor(Math.random() * FRAGMENT_TYPES.length);
    const pick = FRAGMENT_TYPES[randomIndex];

    // 邊界處理：若目錄為空則提供預設值
    const safePick = pick ?? ({ id: 'dawn' } as const);

    const before = getCount(safePick.id);
    await collectFragment(safePick.id);
    const after = getCount(safePick.id);

    // 回傳狀態：如果原本不到 4 個，收集後滿 4 個，則 unlocked 為 true
    return { fragmentId: safePick.id, unlocked: before < 4 && after >= 4 };
  }
  //播放已解鎖的音效
  async function playUnlockedNote(noteId: string): Promise<void> {
    //校驗：未解鎖不可播放
    if ((counts.value[noteId] ?? 0) < 4) return;
    // 呼叫外部音訊引擎 composable
    const audio = useAudioEngine();
    await audio.playNote(noteId);
  }

  //取得碎片的顯示名稱
  function getFragmentLabel(id: string): string {
    return getFragmentById(id)?.label ?? id;
  }

  return {
    // State
    counts,
    lastCollected,
    // Getters
    displayList,
    progressById,
    unlockedNoteIds,
    collectionSummary,
    // Actions
    getCount,
    collectRandomFragment,
    playUnlockedNote,
    getFragmentLabel,
  };
});
