'use client'
import { useQuery } from '@tanstack/react-query'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Menu, AlertTriangle, PackageX, CalendarClock, AlertCircle } from 'lucide-react'
import { NAV_ITEMS } from './nav'
import { useMemo } from 'react'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { module } = useUI()
  const { user } = useAuth()
  const current = NAV_ITEMS.find((i) => i.key === module)

  const { data: alerts } = useQuery<{ lowStock: number; outStock: number; nearExpiry: number; expired: number; totalReceivables: number }>({
    queryKey: ['dashboard'],
    queryFn: async () => (await fetch('/api/dashboard')).json(),
    refetchInterval: 60_000,
  })

  const alertItems = useMemo(() => {
    if (!alerts) return []
    const arr: Array<{ icon: React.ReactNode; label: string; count: number; color: string }> = []
    if (alerts.outStock > 0) arr.push({ icon: <PackageX className="w-4 h-4" />, label: 'Sin stock', count: alerts.outStock, color: 'text-red-500' })
    if (alerts.lowStock > 0) arr.push({ icon: <AlertTriangle className="w-4 h-4" />, label: 'Bajo stock', count: alerts.lowStock, color: 'text-yellow-500' })
    if (alerts.nearExpiry > 0) arr.push({ icon: <CalendarClock className="w-4 h-4" />, label: 'Por vencer', count: alerts.nearExpiry, color: 'text-orange-500' })
    if (alerts.expired > 0) arr.push({ icon: <AlertCircle className="w-4 h-4" />, label: 'Vencidos', count: alerts.expired, color: 'text-gray-500' })
    return arr
  }, [alerts])

  const Icon = current?.icon
  return (
    <header className="h-16 border-b bg-card flex items-center gap-3 px-4 shrink-0">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-5 h-5 text-muted-foreground shrink-0" />}
        <h1 className="font-semibold text-lg truncate">{current?.label}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5">
          {alertItems.map((a, i) => (
            <Badge key={i} variant="outline" className={`gap-1 ${a.color}`}>
              {a.icon}
              {a.count}
            </Badge>
          ))}
          {alerts && alerts.totalReceivables > 0 && (
            <Badge variant="outline" className="gap-1 text-blue-500">
              <AlertCircle className="w-4 h-4" />
              S/ {alerts.totalReceivables.toFixed(0)}
            </Badge>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
