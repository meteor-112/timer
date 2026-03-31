import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { get, ref as dbRef, set } from 'firebase/database'
import { firebaseAuth } from '@/lib/firebase'
import { firebaseDb } from '@/lib/firebase'

export type AuthKind = 'none' | 'guest' | 'google'

export type Profile = {
  name: string
  message: string
}

const GUEST_KEY = 'timer_guest_uid_v1'
const PROFILE_KEY = 'timer_profile_v1'
const GOOGLE_PROFILE_KEY = (uid: string) => `users/${uid}/profile`

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function generateGuestUid(): string {
  try {
    return `guest_${crypto.randomUUID()}`
  } catch {
    return `guest_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`
  }
}

function loadGuestUid(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY)
  } catch {
    return null
  }
}

function persistGuestUid(uid: string) {
  try {
    localStorage.setItem(GUEST_KEY, uid)
  } catch {
    // ignore
  }
}

function loadProfile(): Profile {
  const fallback: Profile = { name: '', message: '' }
  try {
    const parsed = safeJsonParse<Profile>(localStorage.getItem(PROFILE_KEY))
    if (!parsed || typeof parsed !== 'object') return fallback
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      message: typeof parsed.message === 'string' ? parsed.message : '',
    }
  } catch {
    return fallback
  }
}

function persistProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

export const useAuthStore = defineStore('auth', () => {
  const kind = ref<AuthKind>('none')
  const firebaseUser = ref<User | null>(null)
  const guestUid = ref<string | null>(loadGuestUid())
  const profile = ref<Profile>(loadProfile())

  let googleProfileLoadSeq = 0

  const uid = computed(() => {
    if (kind.value === 'google') return firebaseUser.value?.uid ?? null
    if (kind.value === 'guest') return guestUid.value
    return null
  })

  const displayName = computed(() => {
    const localName = profile.value.name.trim()
    if (localName) return localName
    if (kind.value === 'google') return firebaseUser.value?.displayName ?? '匿名'
    if (kind.value === 'guest') return '遊客'
    return '未登入'
  })

  let unsubAuth: (() => void) | null = null

  function init() {
    if (unsubAuth) return
    let authInstance
    try {
      authInstance = firebaseAuth()
    } catch {
      // Firebase 尚未設定時直接略過（僅支援遊客模式）
      return
    }
    unsubAuth = onAuthStateChanged(authInstance, (u) => {
      firebaseUser.value = u
      if (u) {
        kind.value = 'google'
        void loadGoogleProfile(u.uid)
        return
      }
      // 沒有 google 時，如果已有 guest uid，維持 guest；否則維持 none
      if (guestUid.value) kind.value = 'guest'
      else kind.value = 'none'
    })
  }

  async function loadGoogleProfile(userId: string): Promise<void> {
    const seq = ++googleProfileLoadSeq
    let db
    try {
      db = firebaseDb()
    } catch {
      return
    }

    try {
      const snap = await get(dbRef(db, GOOGLE_PROFILE_KEY(userId)))
      if (seq !== googleProfileLoadSeq) return
      const v = snap.val() as Partial<Profile> | null
      const next: Profile = {
        name: typeof v?.name === 'string' ? v.name : '',
        message: typeof v?.message === 'string' ? v.message : '',
      }
      profile.value = next
    } catch {
      // ignore
    }
  }

  async function saveGoogleProfile(userId: string, next: Profile): Promise<void> {
    let db
    try {
      db = firebaseDb()
    } catch {
      return
    }
    try {
      await set(dbRef(db, GOOGLE_PROFILE_KEY(userId)), {
        name: next.name.trim().slice(0, 20),
        message: next.message.trim().slice(0, 80),
        updatedAt: Date.now(),
      })
    } catch {
      // ignore
    }
  }

  function startAsGuest() {
    if (!guestUid.value) {
      guestUid.value = generateGuestUid()
      persistGuestUid(guestUid.value)
    }
    kind.value = 'guest'
  }

  async function connectGoogle() {
    init()
    let authInstance
    try {
      authInstance = firebaseAuth()
    } catch {
      throw new Error('Firebase is not configured')
    }
    const provider = new GoogleAuthProvider()
    const res = await signInWithPopup(authInstance, provider)
    // 直接同步到 store，避免只靠 onAuthStateChanged 導致「登入後要刷新才顯示」
    firebaseUser.value = res.user
    kind.value = 'google'
    await loadGoogleProfile(res.user.uid)
  }

  async function logout() {
    let authInstance
    try {
      authInstance = firebaseAuth()
    } catch {
      // 沒有 Firebase 時，直接本地重置狀態
      firebaseUser.value = null
      if (guestUid.value) kind.value = 'guest'
      else kind.value = 'none'
      return
    }
    await signOut(authInstance).catch(() => {})
    firebaseUser.value = null
    // 登出後回到 guest（若存在），否則 none
    if (guestUid.value) kind.value = 'guest'
    else kind.value = 'none'
  }

  function updateProfile(next: Partial<Profile>) {
    const merged: Profile = {
      name: typeof next.name === 'string' ? next.name : profile.value.name,
      message: typeof next.message === 'string' ? next.message : profile.value.message,
    }
    profile.value = merged

    if (kind.value === 'google' && firebaseUser.value?.uid) {
      void saveGoogleProfile(firebaseUser.value.uid, merged)
      return
    }
    // guest：仍維持本機保存
    persistProfile(merged)
  }

  return {
    // state
    kind,
    firebaseUser,
    guestUid,
    profile,
    // getters
    uid,
    displayName,
    // actions
    init,
    startAsGuest,
    connectGoogle,
    logout,
    updateProfile,
  }
})

