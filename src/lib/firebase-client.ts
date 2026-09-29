import type { FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let currentConfigKey = ''
let lastSignedInUid: string | null = null

export async function getFirebase(config: {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
}): Promise<{ app: FirebaseApp; db: Firestore; auth: Auth }> {
  const configKey = JSON.stringify(config)
  if (app && db && auth && currentConfigKey === configKey) return { app, db, auth }
  if (!config.apiKey || !config.projectId || !config.appId) throw new Error('Configuración de Firebase incompleta')
  const [{ initializeApp }, { getFirestore }, { getAuth }] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
    import('firebase/auth'),
  ])
  app = initializeApp(config)
  db = getFirestore(app)
  auth = getAuth(app)
  currentConfigKey = configKey
  lastSignedInUid = null
  return { app, db, auth }
}

export async function ensureFirebaseAuth(
  config: { apiKey?: string; authDomain?: string; projectId?: string; storageBucket?: string; messagingSenderId?: string; appId?: string },
  email: string,
  password: string,
): Promise<string> {
  const { auth: authInstance } = await getFirebase(config)
  const { signInWithEmailAndPassword, signOut } = await import('firebase/auth')

  if (authInstance.currentUser?.email === email) {
    lastSignedInUid = authInstance.currentUser.uid
    return lastSignedInUid
  }

  if (authInstance.currentUser) {
    await signOut(authInstance)
  }

  const cred = await signInWithEmailAndPassword(authInstance, email, password)
  lastSignedInUid = cred.user.uid
  return lastSignedInUid
}

export async function testFirebaseConnection(config: any) {
  try {
    const { db: fs } = await getFirebase(config)
    const { collection, getDocs } = await import('firebase/firestore')
    await getDocs(collection(fs, '_health_check'))
    return { ok: true, projectId: config.projectId }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function testFirebaseAuthConnection(config: any, email: string, password: string) {
  try {
    const uid = await ensureFirebaseAuth(config, email, password)
    const { db: fs } = await getFirebase(config)
    const { collection, getDocs } = await import('firebase/firestore')
    await getDocs(collection(fs, 'products'))
    return { ok: true, projectId: config.projectId, uid }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
