'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wifi, WifiOff, Loader2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGlobalSync, type SyncState } from '@/hooks/use-global-sync'
import { toast } from 'sonner'

interface SyncIndicatorProps {
  compact?: boolean
}

const STATE_CONFIG: Record<SyncState, { label: string; icon: typeof Wifi; color: string; pulse?: boolean }> = {
  connected: { label: 'Conectado', icon: CheckCircle2, color: 'text-emerald-500' },
  syncing:   { label: 'Sincronizando', icon: Loader2, color: 'text-blue-500', pulse: true },
  pending:   { label: 'Pendiente', icon: Clock, color: 'text-amber-500' },
  offline:   { label: 'Sin conexión', icon: WifiOff, color: 'text-muted-foreground' },
  error:     { label: 'Error sync', icon: AlertTriangle, color: 'text-red-500' },
}

export function SyncIndicator({ compact = true }: SyncIndicatorProps) {
  const { state, lastSync, pendingCount, triggerSyncNow } = useGlobalSync()
  const [nowTick, setNowTick] = useState(Date.now())

  // Re-render cada 30s para que el "hace X" se actualice
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const cfg = STATE_CONFIG[state] || STATE_CONFIG.connected
  const Icon = cfg.icon

  const handleManualSync = async () => {
    if (state === 'syncing') return
    toast.info('Sincronizando manualmente...')
    await triggerSyncNow()
    if (state !== 'error' && state !== 'offline') {
      toast.success('Sincronización completa')
    }
  }

  // Tiempo relativo
  let relativeTime = '—'
  if (lastSync) {
    const diff = Math.floor((nowTick - new Date(lastSync).getTime()) / 1000)
    if (diff < 60) relativeTime = `hace ${diff}s`
    else if (diff < 3600) relativeTime = `hace ${Math.floor(diff / 60)}min`
    else relativeTime = `hace ${Math.floor(diff / 3600)}h`
  }

  if (compact) {
    return (
      <button
        onClick={handleManualSync}
        title={`Estado: ${cfg.label} · Última sync: ${relativeTime}${pendingCount > 0 ? ` · ${pendingCount} pendiente(s)` : ''} · Clic para sincronizar ahora`}
        className="flex items-center gap-1.5 px-2 h-7 rounded-md hover:bg-accent transition-colors text-xs"
      >
        <Icon className={cn('w-3.5 h-3.5', cfg.color, cfg.pulse && 'animate-spin')} />
        <span className={cn('font-medium', cfg.color)}>{cfg.label}</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
      </button>
    )
  }

  // Versión expandida (para usar en settings page)
  return (
    <Badge variant="outline" className={cn('gap-1.5', cfg.color)}>
      <Icon className={cn('w-3 h-3', cfg.pulse && 'animate-spin')} />
      {cfg.label}
      {lastSync && <span className="text-[10px] text-muted-foreground">· {relativeTime}</span>}
    </Badge>
  )
}
