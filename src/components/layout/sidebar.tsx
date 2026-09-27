'use client'
import Link from 'next/link'
import { useAuth } from '@/store/auth'
import { useUI } from '@/store/ui'
import { useBusiness } from '@/lib/hooks'
import { NAV_ITEMS } from './nav'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { LogOut, X, Store } from 'lucide-react'

const GROUP_LABELS: Record<string, string> = {
  principal: 'Principal',
  comercial: 'Comercial',
  gestión: 'Gestión',
  sistema: 'Sistema',
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout, has } = useAuth()
  const { module, setModule } = useUI()
  const { business } = useBusiness()

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)))
  const visible = NAV_ITEMS.filter((i) => !i.perm || has(i.perm))

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate text-sidebar-foreground">{business?.name || 'POS Pro'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.name}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-4 px-2">
          {groups.map((g) => {
            const items = visible.filter((i) => i.group === g)
            if (!items.length) return null
            return (
              <div key={g}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{GROUP_LABELS[g]}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = module === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => { setModule(item.key); onClose?.() }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                          active ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border shrink-0">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => logout()}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}

export { NAV_ITEMS }
