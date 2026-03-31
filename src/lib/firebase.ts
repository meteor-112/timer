import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

function requiredEnv(name: string): string | null {
  const v = import.meta.env[name] as string | undefined
  if (!v || !v.trim()) return null
  return v
}

let cachedApp: FirebaseApp | null = null
let cachedError: Error | null = null

function tryGetFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp
  if (cachedError) return null
  try {
    if (getApps().length) {
      cachedApp = getApps()[0]!
      return cachedApp
    }
    const apiKey = requiredEnv('VITE_FIREBASE_API_KEY')
    const authDomain = requiredEnv('VITE_FIREBASE_AUTH_DOMAIN')
    const databaseURL = requiredEnv('VITE_FIREBASE_DATABASE_URL')
    const projectId = requiredEnv('VITE_FIREBASE_PROJECT_ID')
    const appId = requiredEnv('VITE_FIREBASE_APP_ID')

    if (!apiKey || !authDomain || !databaseURL || !projectId || !appId) {
      throw new Error('Firebase env not configured')
    }

    cachedApp = initializeApp({ apiKey, authDomain, databaseURL, projectId, appId })
    return cachedApp
  } catch (e) {
    cachedError = e instanceof Error ? e : new Error(String(e))
    if (import.meta.env.DEV) {
       
      console.warn('[timer] Firebase disabled:', cachedError.message)
    }
    return null
  }
}

export function isFirebaseReady(): boolean {
  return tryGetFirebaseApp() != null
}

export function firebaseAuth() {
  const app = tryGetFirebaseApp()
  if (!app) throw new Error('Firebase is not configured')
  return getAuth(app)
}

export function firebaseDb() {
  const app = tryGetFirebaseApp()
  if (!app) throw new Error('Firebase is not configured')
  return getDatabase(app)
}


