'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/hooks'

/**
 * Estado global de la sincronización con Firebase.
 * Se monta UNA sola vez en AppShell, así corre en TODAS las páginas (no solo en Configuración).
 *
 * Funcionalidades:
 * - Sincronización periódica automática (cada syncIntervalMin minutos)
 * - Detección de online/offline (reintenta al volver conexión)
 * - Cola de operaciones pendientes en localStorage
 * - Método triggerSyncNow() para invocar sync inmediato tras crear venta/producto/cliente
 * - Estado visible: connected / syncing / pending / offline / error
 */

export type SyncState = 'connected' | 'syncing' | 'pending' | 'offline' | 'error'

interface SyncConfig {
  autoSync: boolean
  syncIntervalMin: number
}

interface PendingOp {
  type: 'sale' | 'product' | 'customer' | 'category' | 'supplier'
  id: string
  queuedAt: string
}

const PENDING_KEY = 'pos-sync-pending'
const LAST_SYNC_KEY = 'pos-sync-last'

function loadPending(): PendingOp[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingOp[]) : []
  } catch { return [] }
}

function savePending(ops: PendingOp[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(ops)) } catch {}
}

function loadLastSync(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(LAST_SYNC_KEY) } catch { return null }
}

function saveLastSync(iso: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LAST_SYNC_KEY, iso) } catch {}
}

let triggerFn: (() => Promise<void>) | null = null

/**
 * Hook global de sincronización. Montar UNA vez en AppShell.
 */
export function useGlobalSync() {
  const [state, setState] = useState<SyncState>('connected')
  const [lastSync, setLastSync] = useState<string | null>(loadLastSync)
  const [pendingCount, setPendingCount] = useState<number>(loadPending().length)
  const [config, setConfig] = useState<SyncConfig>({ autoSync: true, syncIntervalMin: 5 })
  const syncingRef = useRef(false)
  const initialized = useRef(false)

  // Cargar configuración desde /api/config/database
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    ;(async () => {
      try {
        const d = await apiFetch<{ config: any }>('/api/config/database')
        if (d?.config) {
          setConfig({
            autoSync: d.config.autoSync !== false,
            syncIntervalMin: d.config.syncIntervalMin || 5,
          })
        }
      } catch (e) { /* sin configuración, usar defaults */ }
    })()
  }, [])

  // Ejecutar sync
  const runSync = useCallback(async (direction: 'upload' | 'both' = 'upload') => {
    if (syncingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline')
      return
    }
    syncingRef.current = true
    setState('pending')
    try {
      setState('syncing')
      const res = await apiFetch<{ ok: boolean; uploaded: number; errors: string[] }>('/api/config/sync', {
        method: 'POST',
        body: JSON.stringify({ direction }),
      })
      if (res?.ok) {
        const now = new Date().toISOString()
        saveLastSync(now)
        setLastSync(now)
        // Limpiar cola pendiente (todos los pending se subieron en este sync)
        if (loadPending().length > 0) {
          savePending([])
          setPendingCount(0)
        }
        setState('connected')
      } else if (res?.errors?.length) {
        setState('error')
      } else {
        setState('connected')
      }
    } catch (e: any) {
      // Si falla por conexión, guardar en cola y marcar offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setState('offline')
      } else {
        setState('error')
      }
    } finally {
      syncingRef.current = false
    }
  }, [])

  // Exponer triggerSyncNow para que otros componentes lo invoquen
  const triggerSyncNow = useCallback(async () => {
    if (!config.autoSync) return
    await runSync('upload')
  }, [config.autoSync, runSync])

  // Registrar función global para que otros componentes puedan trigger sync
  useEffect(() => {
    triggerFn = triggerSyncNow
    return () => { triggerFn = null }
  }, [triggerSyncNow])

  // Escuchar cambios online/offline
  useEffect(() => {
    const onOnline = () => {
      setState('connected')
      // Vuelta de conexión: procesar cola pendiente
      if (loadPending().length > 0 || config.autoSync) {
        runSync('upload')
      }
    }
    const onOffline = () => setState('offline')
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }
  }, [config.autoSync, runSync])

  // Sincronización periódica (solo si autoSync está activado)
  useEffect(() => {
    if (!config.autoSync) return
    const intervalMs = Math.max(60, config.syncIntervalMin * 60) * 1000
    const id = setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        runSync('upload')
      }
    }, intervalMs)
    return () => clearInterval(id)
  }, [config.autoSync, config.syncIntervalMin, runSync])

  // Cargar config cada 30s (por si el usuario la cambia en settings)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const d = await apiFetch<{ config: any }>('/api/config/database')
        if (d?.config) {
          setConfig({
            autoSync: d.config.autoSync !== false,
            syncIntervalMin: d.config.syncIntervalMin || 5,
          })
        }
      } catch {}
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  return {
    state,
    lastSync,
    pendingCount,
    config,
    triggerSyncNow,
    enqueuePending: (op: PendingOp) => {
      const ops = loadPending()
      ops.push(op)
      savePending(ops)
      setPendingCount(ops.length)
    },
  }
}

/**
 * Helper para invocar sync desde cualquier componente (sin usar contexto).
 * Retorna null si el hook global aún no se ha montado.
 */
export function triggerGlobalSync(): Promise<void> | null {
  return triggerFn ? triggerFn() : null
}
