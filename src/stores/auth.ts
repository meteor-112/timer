import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';
import { get, ref as dbRef, set } from 'firebase/database';
import { firebaseAuth } from '@/lib/firebase';
import { firebaseDb } from '@/lib/firebase';

export type AuthKind = 'none' | 'guest' | 'google';

export type Profile = {
  name: string;
  message: string;
};

const GUEST_KEY = 'timer_guest_uid_v1';
const PROFILE_KEY = 'timer_profile_v1';
const GOOGLE_PROFILE_KEY = (uid: string) => `users/${uid}/profile`;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function generateGuestUid(): string {
  try {
    return `guest_${crypto.randomUUID()}`;
  } catch {
    return `guest_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  }
}

function loadGuestUid(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY);
  } catch {
    return null;
  }
}

function persistGuestUid(uid: string) {
  try {
    localStorage.setItem(GUEST_KEY, uid);
  } catch {
    // ignore
  }
}

function loadProfile(): Profile {
  const fallback: Profile = { name: '', message: '' };
  try {
    const parsed = safeJsonParse<Profile>(localStorage.getItem(PROFILE_KEY));
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      message: typeof parsed.message === 'string' ? parsed.message : '',
    };
  } catch {
    return fallback;
  }
}

function persistProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export const useAuthStore = defineStore('auth', () => {
  const kind = ref<AuthKind>('none');
  const firebaseUser = ref<User | null>(null);
  const guestUid = ref<string | null>(loadGuestUid());
  const profile = ref<Profile>(loadProfile());

  let googleProfileLoadSeq = 0;

  const uid = computed(() => {
    if (kind.value === 'google') return firebaseUser.value?.uid ?? null;
    if (kind.value === 'guest') return firebaseUser.value?.uid ?? guestUid.value;
    return null;
  });

  const displayName = computed(() => {
    const localName = profile.value.name.trim();
    if (localName) return localName;
    if (kind.value === 'google') return firebaseUser.value?.displayName ?? '匿名';
    if (kind.value === 'guest') return '遊客';
    return '未登入';
  });

  let unsubAuth: (() => void) | null = null;

  // 自動登入邏輯：透過 onAuthStateChanged 實現
  function init() {
    if (unsubAuth) return;
    let authInstance;
    try {
      authInstance = firebaseAuth();
    } catch {
      return;
    }
    unsubAuth = onAuthStateChanged(authInstance, (u) => {
      firebaseUser.value = u;
      if (u) {
        // 自動判斷身分：若為匿名則是 guest，否則為 google
        kind.value = u.isAnonymous ? 'guest' : 'google';
        void loadGoogleProfile(u.uid);
        return;
      }

      // 完全沒有 Firebase session 時
      if (guestUid.value) kind.value = 'guest';
      else kind.value = 'none';
    });
  }

  async function loadGoogleProfile(userId: string): Promise<void> {
    const seq = ++googleProfileLoadSeq;
    let db;
    try {
      db = firebaseDb();
    } catch {
      return;
    }

    try {
      const snap = await get(dbRef(db, GOOGLE_PROFILE_KEY(userId)));
      if (seq !== googleProfileLoadSeq) return;
      const v = snap.val() as Partial<Profile> | null;
      const next: Profile = {
        name: typeof v?.name === 'string' ? v.name : '',
        message: typeof v?.message === 'string' ? v.message : '',
      };
      profile.value = next;
    } catch {
      // ignore
    }
  }

  async function saveGoogleProfile(userId: string, next: Profile): Promise<void> {
    let db;
    try {
      db = firebaseDb();
    } catch {
      return;
    }
    try {
      await set(dbRef(db, GOOGLE_PROFILE_KEY(userId)), {
        name: next.name.trim().slice(0, 20),
        message: next.message.trim().slice(0, 80),
        updatedAt: Date.now(),
      });
    } catch {
      // ignore
    }
  }

  // 升級 startAsGuest：加入 Firebase 匿名登入
  async function startAsGuest() {
    let authInstance;
    try {
      authInstance = firebaseAuth();
      const res = await signInAnonymously(authInstance);
      firebaseUser.value = res.user;
      kind.value = 'guest';
    } catch {
      // 若 Firebase 未設定，降級回原本的 localStorage 模式
      if (!guestUid.value) {
        guestUid.value = generateGuestUid();
        persistGuestUid(guestUid.value);
      }
      kind.value = 'guest';
    }
  }

  async function connectGoogle() {
    init();
    let authInstance;
    try {
      authInstance = firebaseAuth();
    } catch {
      throw new Error('Firebase is not configured');
    }
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(authInstance, provider);
    firebaseUser.value = res.user;
    kind.value = 'google';
    await loadGoogleProfile(res.user.uid);
  }

  async function logout() {
    let authInstance;
    try {
      authInstance = firebaseAuth();
      await signOut(authInstance);
    } catch {
      // ignore
    }

    firebaseUser.value = null;
    // 徹底登出時，若你想保留本地 guest uuid 則設為 guest，否則設為 none
    if (guestUid.value) {
      kind.value = 'guest';
    } else {
      kind.value = 'none';
    }
  }

  function updateProfile(next: Partial<Profile>) {
    const merged: Profile = {
      name: typeof next.name === 'string' ? next.name : profile.value.name,
      message: typeof next.message === 'string' ? next.message : profile.value.message,
    };
    profile.value = merged;

    if (kind.value === 'google' && firebaseUser.value?.uid) {
      void saveGoogleProfile(firebaseUser.value.uid, merged);
      return;
    }
    persistProfile(merged);
  }

  return {
    kind,
    firebaseUser,
    guestUid,
    profile,
    uid,
    displayName,
    init,
    startAsGuest,
    connectGoogle,
    logout,
    updateProfile,
  };
});
