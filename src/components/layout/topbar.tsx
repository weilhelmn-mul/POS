'use client'
import { useQuery } from '@tanstack/react-query'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useBusiness } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from './theme-toggle'
import { SyncIndicator } from './sync-indicator'
import { PackageX, AlertTriangle, CalendarClock, AlertCircle, Menu, Bell } from 'lucide-react'
import { NAV_ITEMS } from './nav'
import { useMemo } from 'react'
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { module } = useUI()
  const { user } = useAuth()
  const { business } = useBusiness()
  const current = NAV_ITEMS.find((i) => i.key === module)
  const { data: alerts } = useQuery<{ lowStock: number; outStock: number; nearExpiry: number; expired: number; totalReceivables: number }>({ queryKey: ['dashboard'], queryFn: async () => (await fetch('/api/dashboard')).json(), refetchInterval: 60_000 })
  const alertItems = useMemo(() => { if (!alerts) return []; const arr: Array<{ icon: React.ReactNode; label: string; count: number; color: string }> = []; if (alerts.outStock > 0) arr.push({ icon: <PackageX className="w-4 h-4" />, label: 'Sin stock', count: alerts.outStock, color: 'text-red-500' }); if (alerts.lowStock > 0) arr.push({ icon: <AlertTriangle className="w-4 h-4" />, label: 'Bajo stock', count: alerts.lowStock, color: 'text-yellow-500' }); if (alerts.nearExpiry > 0) arr.push({ icon: <CalendarClock className="w-4 h-4" />, label: 'Por vencer', count: alerts.nearExpiry, color: 'text-orange-500' }); if (alerts.expired > 0) arr.push({ icon: <AlertCircle className="w-4 h-4" />, label: 'Vencidos', count: alerts.expired, color: 'text-gray-500' }); return arr }, [alerts])
  return (
    <header className="sticky top-0 z-30 w-full pt-safe bg-background/85 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="h-12 px-2 sm:px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="lg:hidden -ml-1 h-8 w-8" onClick={onMenu}><Menu className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md"><span className="material-symbols-outlined text-[18px]">point_of_sale</span></div>
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-1.5"><span className="font-bold text-sm tracking-wide text-foreground uppercase truncate" style={{ fontFamily: 'var(--font-outfit)' }}>POS PRO</span><span className="text-[10px] text-muted-foreground hidden min-[420px]:inline truncate">| {business?.name || 'Ventas'}</span></div>
              <div className="flex items-center gap-1.5 -mt-0.5"><span className="w-1 h-1 rounded-full bg-secondary shadow-[0_0_4px_rgba(78,222,163,0.7)] animate-pulse-soft flex-shrink-0" /><span className="text-[10px] text-secondary font-semibold tracking-wide truncate">{current?.label ? current.label : 'Inicio'}</span></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <SyncIndicator compact />
          <div className="hidden md:flex items-center gap-1">{alertItems.map((a, i) => (<Badge key={i} variant="outline" className={`gap-1 ${a.color} h-6 text-[10px] px-1.5`}>{a.icon}{a.count}</Badge>))}{alerts && alerts.totalReceivables > 0 && (<Badge variant="outline" className="gap-1 text-blue-500 h-6 text-[10px] px-1.5"><AlertCircle className="w-3 h-3" />{alerts.totalReceivables.toFixed(0)}</Badge>)}</div>
          <Button variant="ghost" size="icon" className="md:hidden rounded-full relative h-8 w-8"><Bell className="w-4 h-4" />{alertItems.length > 0 && (<span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error" />)}</Button>
          <ThemeToggle compact />
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0 shadow-md">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
        </div>
      </div>
    </header>
  )
}
