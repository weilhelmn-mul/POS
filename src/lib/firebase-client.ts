import type { FirebaseApp, Firestore } from 'firebase/app'
let app: FirebaseApp | null = null; let db: Firestore | null = null; let currentConfigKey = ''
export async function getFirebase(config: { apiKey?: string; authDomain?: string; projectId?: string; storageBucket?: string; messagingSenderId?: string; appId?: string }): Promise<{ app: FirebaseApp; db: Firestore }> {
  const configKey = JSON.stringify(config)
  if (app && db && currentConfigKey === configKey) return { app, db }
  if (!config.apiKey || !config.projectId || !config.appId) throw new Error('Configuración de Firebase incompleta')
  const [{ initializeApp }, { getFirestore }] = await Promise.all([import('firebase/app'), import('firebase/firestore')])
  app = initializeApp(config); db = getFirestore(app); currentConfigKey = configKey
  return { app, db }
}
export async function testFirebaseConnection(config: any) { try { const { db } = await getFirebase(config); const { collection, getDocs } = await import('firebase/firestore'); await getDocs(collection(db, '_health_check')); return { ok: true, projectId: config.projectId } } catch (e) { return { ok: false, error: (e as Error).message } } }
