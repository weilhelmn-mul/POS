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
    const localIds = new Set(localData.map((i) => String(i.id)).filter(Boolean))
    if (localData.length) {
      const BATCH_SIZE = 400
      let processed = 0
      while (processed < localData.length) {
        const slice = localData.slice(processed, processed + BATCH_SIZE)
        const batch = writeBatch(fs)
        for (const item of slice) {
          if (!item.id || typeof item.id !== 'string') continue
          // ── Aplanar relaciones para que la web admin pueda mostrar nombre del cliente y vendedor
          // sin tener que hacer JOIN con colección customers/users
          if (collection === 'sales') {
            const c = item.customer as any
            if (c && typeof c === 'object') {
              item.customerName = c.name || item.customerName
              item.customerDoc = c.document || item.customerDoc
              // Eliminar el objeto embebido para no duplicar datos en Firestore
              // (la web ya hace lookup por customerId si necesita el resto)
              delete item.customer
            }
            const u = item.user as any
            if (u && typeof u === 'object') {
              item.userName = u.username || u.name || item.userName
              delete item.user
            }
          }
          // ── Metadatos de sincronización
          item.source = 'pos-desktop'
          item.syncStatus = 'synced'
          item.externalId = item.externalId || item.id
          item.syncedAt = syncTs
          item.syncedBy = authInstance?.currentUser?.uid || 'unknown'
          const docRef = doc(colRef, item.id)
          batch.set(docRef, item, { merge: true })
        }
        await batch.commit()
        processed += slice.length
      }
      result.uploaded = localData.length
    }

    // ── CLEANUP: Eliminar de Firebase los documentos que ya no existen en SQLite
    // Esto propaga las eliminaciones (hard-delete) de POS Pro → Firebase → Web admin
    // Solo se aplica a colecciones donde POS Pro es la fuente de verdad
    const CLEANUP_COLLECTIONS = ['products', 'categories', 'suppliers', 'brands']
    if (CLEANUP_COLLECTIONS.includes(collection)) {
      try {
        const remoteSnap = await getDocs(colRef)
        const toDelete: string[] = []
        remoteSnap.forEach((d) => {
          if (!localIds.has(d.id)) {
            toDelete.push(d.id)
          }
        })
        if (toDelete.length > 0) {
          const BATCH_SIZE = 400
          let delProcessed = 0
          while (delProcessed < toDelete.length) {
            const slice = toDelete.slice(delProcessed, delProcessed + BATCH_SIZE)
            const batch = writeBatch(fs)
            for (const id of slice) {
              batch.delete(doc(colRef, id))
            }
            await batch.commit()
            delProcessed += slice.length
          }
        }
      } catch (e) {
        result.errors.push(`${collection} cleanup: ${(e as Error).message}`)
      }
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
      // Incluir customer y user (vendedor) para que Firebase tenga customerName y userName
      // Resuelve el problema de la web admin que no podía mostrar el nombre del cliente
      return await db.sale.findMany({
        include: {
          items: true,
          payments: true,
          customer: { select: { id: true, name: true, document: true, phone: true, email: true, address: true } },
          user: { select: { id: true, username: true, name: true } },
        },
      }) as unknown as Record<string, unknown>[]
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
