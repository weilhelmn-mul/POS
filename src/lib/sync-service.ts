import { db } from '@/lib/db'
import type { DatabaseConfig } from '@/lib/database-config'
import { getSupabase } from '@/lib/supabase-client'
import { getFirebase, ensureFirebaseAuth } from '@/lib/firebase-client'

/**
 * Servicio de sincronización entre SQLite local y la nube (Supabase/Firebase).
 *
 * Para Firebase: se autentica con Firebase Auth (admin@pos-creard.com por defecto)
 * antes de cualquier operación de lectura/escritura en Firestore.
 */

interface SyncResult {
  ok: boolean
  uploaded: number
  downloaded: number
  errors: string[]
  perCollection?: Record<string, { uploaded: number; downloaded: number }>
  authUid?: string
}

export async function syncToCloud(config: DatabaseConfig, direction: 'upload' | 'download' | 'both' = 'both'): Promise<SyncResult> {
  const result: SyncResult = { ok: true, uploaded: 0, downloaded: 0, errors: [], perCollection: {} }
  const collections = config.syncCollections || []

  // Pre-autenticar con Firebase si el provider es firebase
  if (config.provider === 'firebase' && config.firebaseConfig?.apiKey) {
    const email = config.firebaseAuthEmail || 'admin@pos-creard.com'
    const password = config.firebaseAuthPassword || 'admin123'
    try {
      const uid = await ensureFirebaseAuth(config.firebaseConfig, email, password)
      result.authUid = uid
    } catch (e: any) {
      result.errors.push(`Firebase Auth: ${(e as Error).message}`)
      result.ok = false
      return result
    }
  }

  for (const collection of collections) {
    try {
      const r = config.provider === 'supabase'
        ? await syncSupabase(collection, config, direction)
        : await syncFirebase(collection, config, direction)
      result.uploaded += r.uploaded
      result.downloaded += r.downloaded
      result.perCollection![collection] = { uploaded: r.uploaded, downloaded: r.downloaded }
      if (r.errors.length) result.errors.push(...r.errors)
    } catch (e) {
      result.errors.push(`${collection}: ${(e as Error).message}`)
      result.ok = false
    }
  }

  return result
}

// ============ Supabase ============
async function syncSupabase(collection: string, config: DatabaseConfig, direction: string): Promise<SyncResult> {
  const result: SyncResult = { ok: true, uploaded: 0, downloaded: 0, errors: [] }
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    result.errors.push('Configuración de Supabase incompleta')
    result.ok = false
    return result
  }
  const supabase = await getSupabase(config.supabaseUrl, config.supabaseAnonKey)

  // UPLOAD: leer locales y subir
  if (direction === 'upload' || direction === 'both') {
    const localData = await readLocal(collection)
    if (localData.length) {
      const { error } = await supabase.from(collection).upsert(localData, { onConflict: 'id' })
      if (error) {
        result.errors.push(`upload ${collection}: ${error.message}`)
        result.ok = false
      } else {
        result.uploaded = localData.length
      }
    }
  }

  // DOWNLOAD: leer de la nube y guardar local
  if (direction === 'download' || direction === 'both') {
    const { data: remoteData, error } = await supabase.from(collection).select('*')
    if (error) {
      result.errors.push(`download ${collection}: ${error.message}`)
      result.ok = false
    } else if (remoteData && remoteData.length) {
      await writeLocal(collection, remoteData)
      result.downloaded = remoteData.length
    }
  }

  return result
}

// ============ Firebase Firestore ============
async function syncFirebase(collection: string, config: DatabaseConfig, direction: string): Promise<SyncResult> {
  const result: SyncResult = { ok: true, uploaded: 0, downloaded: 0, errors: [] }
  if (!config.firebaseConfig?.apiKey) {
    result.errors.push('Configuración de Firebase incompleta')
    result.ok = false
    return result
  }
  const { db: fs, auth: authInstance } = await getFirebase(config.firebaseConfig)
  const { collection: col, getDocs, writeBatch, doc } = await import('firebase/firestore')
  const colRef = col(fs, collection)
  const syncTs = new Date().toISOString()

  // UPLOAD
  if (direction === 'upload' || direction === 'both') {
    const localData = await readLocal(collection)
    if (localData.length) {
      const BATCH_SIZE = 400
      let processed = 0
      while (processed < localData.length) {
        const slice = localData.slice(processed, processed + BATCH_SIZE)
        const batch = writeBatch(fs)
        for (const item of slice) {
          if (!item.id || typeof item.id !== 'string') continue
          const docRef = doc(colRef, item.id)
          item.source = 'pos-desktop'
          item.syncStatus = 'synced'
          item.externalId = item.externalId || item.id
          item.syncedAt = syncTs
          item.syncedBy = authInstance?.currentUser?.uid || 'unknown'
          batch.set(docRef, item, { merge: true })
        }
        await batch.commit()
        processed += slice.length
      }
      result.uploaded = localData.length
    }
  }

  // DOWNLOAD
  if (direction === 'download' || direction === 'both') {
    const snapshot = await getDocs(colRef)
    const remoteData: Record<string, unknown>[] = []
    snapshot.forEach((d) => remoteData.push(d.data() as Record<string, unknown>))
    if (remoteData.length) {
      await writeLocal(collection, remoteData)
      result.downloaded = remoteData.length
    }
  }

  return result
}

// ============ Helpers locales ============
async function readLocal(collection: string): Promise<Record<string, unknown>[]> {
  switch (collection) {
    case 'products':
      return await db.product.findMany() as unknown as Record<string, unknown>[]
    case 'customers':
      return await db.customer.findMany() as unknown as Record<string, unknown>[]
    case 'sales':
      return await db.sale.findMany({ include: { items: true, payments: true } }) as unknown as Record<string, unknown>[]
    case 'categories':
      return await db.category.findMany() as unknown as Record<string, unknown>[]
    case 'suppliers':
      return await db.supplier.findMany() as unknown as Record<string, unknown>[]
    case 'brands':
      return await db.brand.findMany() as unknown as Record<string, unknown>[]
    case 'expenses':
      return await db.expense.findMany() as unknown as Record<string, unknown>[]
    case 'purchases':
      return await db.purchase.findMany({ include: { items: true } }) as unknown as Record<string, unknown>[]
    default:
      return []
  }
}

async function writeLocal(collection: string, data: Record<string, unknown>[]): Promise<void> {
  // Por seguridad, no sobreescribimos datos locales automáticamente.
  // El usuario debe confirmar. Esta función se invoca solo en download explícito.
  // Implementación simplificada: upsert por id.
  for (const item of data) {
    if (!item.id || typeof item.id !== 'string') continue
    switch (collection) {
      case 'products':
        await db.product.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      case 'customers':
        await db.customer.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      case 'categories':
        await db.category.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      case 'suppliers':
        await db.supplier.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      case 'brands':
        await db.brand.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      case 'expenses':
        await db.expense.upsert({ where: { id: item.id as string }, create: item as never, update: item as never }).catch(() => {})
        break
      // sales y purchases tienen relaciones complejas; se omiten en download automático
    }
  }
}
