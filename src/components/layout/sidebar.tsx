'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth'
import { useUI } from '@/store/ui'
import { useBusiness } from '@/lib/hooks'
import { NAV_ITEMS, GROUP_LABELS, GROUP_ORDER } from './nav'
import type { NavItem } from './nav'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { LogOut, X, Store, ChevronDown, ChevronRight, Zap } from 'lucide-react'
function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => { if (typeof window === 'undefined') return new Set(); try { const raw = localStorage.getItem('pos-nav-collapsed'); if (raw) return new Set(JSON.parse(raw)) } catch { } return new Set(['comercial', 'gestión', 'sistema']) })
  useEffect(() => { try { localStorage.setItem('pos-nav-collapsed', JSON.stringify(Array.from(collapsed))) } catch { } }, [collapsed])
  const toggle = (g: string) => setCollapsed((s) => { const next = new Set(s); if (next.has(g)) next.delete(g); else next.add(g); return next })
  return { collapsed, toggle }
}
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout, has } = useAuth()
  const { module, setModule } = useUI()
  const { business } = useBusiness()
  const { collapsed, toggle } = useCollapsedGroups()
  const visible = NAV_ITEMS.filter((i) => !i.perm || has(i.perm))
  const priorityItems = visible.filter((i) => i.priority)
  const otherItems = visible.filter((i) => !i.priority)
  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shrink-0"><Store className="w-4 h-4" /></div>
        <div className="min-w-0 flex-1"><p className="font-semibold text-xs truncate text-sidebar-foreground leading-tight">{business?.name || 'POS Pro'}</p><p className="text-[10px] text-muted-foreground truncate">{user?.name}</p></div>
        {onClose && (<Button variant="ghost" size="icon" className="ml-auto lg:hidden h-7 w-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>)}
      </div>
      {priorityItems.length > 0 && (<div className="p-2 border-b border-sidebar-border shrink-0 space-y-1"><p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ventas</p>{priorityItems.map((item) => (<NavButton key={item.key} item={item} active={module === item.key} highlight={item.key === 'pos'} onClick={() => { setModule(item.key); onClose?.() }} />))}</div>)}
      <ScrollArea className="flex-1 py-3"><nav className="space-y-2 px-2">{GROUP_ORDER.map((g) => { const items = otherItems.filter((i) => i.group === g); if (!items.length) return null; const isCollapsed = collapsed.has(g); return (<div key={g}><button onClick={() => toggle(g)} className="w-full flex items-center gap-1 px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">{isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}<span className="flex-1 text-left">{GROUP_LABELS[g]}</span><span className="text-[9px] font-normal opacity-60">{items.length}</span></button>{!isCollapsed && (<div className="space-y-0.5">{items.map((item) => (<NavButton key={item.key} item={item} active={module === item.key} onClick={() => { setModule(item.key); onClose?.() }} />))}</div>)}</div>)})}</nav></ScrollArea>
      <div className="p-2 border-t border-sidebar-border shrink-0"><Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => logout()}><LogOut className="w-4 h-4 mr-2" />Cerrar sesión</Button></div>
    </aside>
  )
}
function NavButton({ item, active, highlight, onClick }: { item: NavItem; active: boolean; highlight?: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (<button onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left', active ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : highlight ? 'text-sidebar-foreground font-medium hover:bg-sidebar-accent' : 'text-sidebar-foreground hover:bg-sidebar-accent')}><Icon className={cn('w-4 h-4 shrink-0', highlight && !active && 'text-primary')} /><span className="truncate flex-1">{item.label}</span>{highlight && !active && <Zap className="w-3 h-3 text-primary shrink-0" />}</button>)
}
export { NAV_ITEMS }
