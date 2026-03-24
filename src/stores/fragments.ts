import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { FRAGMENT_TYPES, getFragmentById } from '@/data/audioCatalog';
import { useAudioEngine } from '@/composables/useAudioEngine';

type FragmentCounts = Record<string, number>;

const STORAGE_KEY = 'timer_fragments_v1';

function loadCounts(): FragmentCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FragmentCounts;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function persistCounts(counts: FragmentCounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore
  }
}

export const useFragmentsStore = defineStore('fragments', () => {
  const counts = ref<FragmentCounts>(loadCounts());
  const lastCollected = ref<{ fragmentId: string; collectedAt: number } | null>(null);

  const progressById = computed(() => {
    const result: Record<string, number> = {};
    for (const f of FRAGMENT_TYPES) {
      result[f.id] = counts.value[f.id] ?? 0;
    }
    return result;
  });

  const unlockedNoteIds = computed(() => {
    return FRAGMENT_TYPES.filter((f) => (counts.value[f.id] ?? 0) >= 4).map((f) => f.id);
  });

  function getCount(fragmentId: string): number {
    return counts.value[fragmentId] ?? 0;
  }

  async function collectFragment(fragmentId: string): Promise<void> {
    counts.value[fragmentId] = (counts.value[fragmentId] ?? 0) + 1;
    persistCounts(counts.value);
    lastCollected.value = { fragmentId, collectedAt: Date.now() };
  }

  async function collectRandomFragment(): Promise<{ fragmentId: string; unlocked: boolean }> {
    const pick = FRAGMENT_TYPES[Math.floor(Math.random() * FRAGMENT_TYPES.length)] ?? FRAGMENT_TYPES[0];
    const safePick = pick ?? ({ id: 'dawn' } as const);
    const before = getCount(safePick.id);
    await collectFragment(safePick.id);
    const after = getCount(safePick.id);
    return { fragmentId: safePick.id, unlocked: before < 4 && after >= 4 };
  }

  async function playUnlockedNote(noteId: string): Promise<void> {
    if ((counts.value[noteId] ?? 0) < 4) return;
    const audio = useAudioEngine();
    await audio.playNote(noteId);
  }

  function resetAll(): void {
    counts.value = {};
    lastCollected.value = null;
    persistCounts(counts.value);
  }

  const collectionSummary = computed(() => {
    const totalCollected = Object.values(counts.value).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      totalCollected,
      unlockedCount: unlockedNoteIds.value.length,
    };
  });

  function getFragmentLabel(id: string): string {
    return getFragmentById(id)?.label ?? id;
  }

  return {
    counts,
    lastCollected,
    progressById,
    unlockedNoteIds,
    collectionSummary,
    getCount,
    collectRandomFragment,
    playUnlockedNote,
    resetAll,
    getFragmentLabel,
  };
});
