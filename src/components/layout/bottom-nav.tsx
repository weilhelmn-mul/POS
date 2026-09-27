'use client'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { ShoppingCart, LayoutDashboard, Package, Users, MoreHorizontal, type LucideIcon } from 'lucide-react'
import type { ModuleKey } from '@/store/ui'
interface BottomItem { key: ModuleKey | 'more'; label: string; icon: LucideIcon; perm?: string }
const BOTTOM_ITEMS: BottomItem[] = [{ key: 'pos', label: 'Ventas', icon: ShoppingCart, perm: 'sales.create' }, { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { key: 'products', label: 'Inventario', icon: Package, perm: 'products.view' }, { key: 'customers', label: 'Clientes', icon: Users, perm: 'customers.create' }, { key: 'more', label: 'Más', icon: MoreHorizontal }]
export function BottomNav() {
  const { module, setModule, setSidebarOpen } = useUI()
  const { has } = useAuth()
  const visible = BOTTOM_ITEMS.filter((i) => !i.perm || has(i.perm as any))
  const handleClick = (item: BottomItem) => { if (item.key === 'more') { setSidebarOpen(true); return } setModule(item.key as ModuleKey) }
  return (<nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pb-safe bg-background/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.25)]"><div className="flex items-center justify-around h-20 px-1 max-w-md mx-auto">{visible.map((item) => { const Icon = item.icon; const active = module === item.key; return (<button key={item.key} onClick={() => handleClick(item)} className={`group flex flex-col items-center justify-center min-w-[56px] min-h-[52px] px-1 py-1 rounded-xl transition-colors relative ${active ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-foreground'}`}><Icon className={`w-7 h-7 mb-0.5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} /><span className="text-[11px] tracking-tight leading-tight">{item.label}</span>{active && <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(76,215,246,0.7)]" />}</button>) })}</div></nav>)
}
