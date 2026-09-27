import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let currentConfigKey = ''

/**
 * Inicializa Firebase con la configuración proporcionada.
 * Cachea la instancia para no reinicializar en cada llamada.
 */
export function getFirebase(config: {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
}): { app: FirebaseApp; db: Firestore } {
  const configKey = JSON.stringify(config)
  if (app && db && currentConfigKey === configKey) {
    return { app, db }
  }
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('Configuración de Firebase incompleta. Se requieren apiKey, projectId y appId.')
  }
  app = initializeApp(config)
  db = getFirestore(app)
  currentConfigKey = configKey
  return { app, db }
}

/**
 * Prueba la conexión a Firebase intentando leer una colección.
 */
export async function testFirebaseConnection(config: {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
}): Promise<{ ok: boolean; error?: string; projectId?: string }> {
  try {
    const { db } = getFirebase(config)
    // Intentar leer una colección pequeña para verificar la conexión
    const { collection, getDocs, limit } = await import('firebase/firestore')
    const snapshot = await getDocs(collection(db, '_health_check'))
    return { ok: true, projectId: config.projectId }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
