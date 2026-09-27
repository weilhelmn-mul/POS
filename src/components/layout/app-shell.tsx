'use client'
import { useEffect } from 'react'
import { useAuth } from '@/store/auth'
import { useUI } from '@/store/ui'
import { useCart } from '@/store/cart'
import { Login } from './login'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { BottomNav } from './bottom-nav'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
const modules = { dashboard: dynamic(() => import('@/components/modules/dashboard')), pos: dynamic(() => import('@/components/modules/pos')), products: dynamic(() => import('@/components/modules/products')), categories: dynamic(() => import('@/components/modules/categories')), customers: dynamic(() => import('@/components/modules/customers')), sales: dynamic(() => import('@/components/modules/sales')), receivables: dynamic(() => import('@/components/modules/receivables')), purchases: dynamic(() => import('@/components/modules/purchases')), expenses: dynamic(() => import('@/components/modules/expenses')), reports: dynamic(() => import('@/components/modules/reports')), users: dynamic(() => import('@/components/modules/users')), audit: dynamic(() => import('@/components/modules/audit')), export: dynamic(() => import('@/components/modules/export-data')), backup: dynamic(() => import('@/components/modules/backup')), settings: dynamic(() => import('@/components/modules/settings')) }
export function AppShell() {
  const { user, loading, fetchUser } = useAuth()
  const { module, sidebarOpen, setSidebarOpen } = useUI()
  const ensureSale = useCart((s) => s.newSale)
  const sales = useCart((s) => s.sales)
  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { if (user && module === 'pos' && sales.length === 0) ensureSale() }, [user, module, sales.length, ensureSale])
  if (loading) return (<div className="min-h-screen flex items-center justify-center bg-background"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><span className="material-symbols-outlined text-[24px]">point_of_sale</span></div><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></div>)
  if (!user) return <Login />
  const Active = modules[module] as React.ComponentType
  return (<div className="min-h-screen flex bg-background"><div className="hidden lg:block shrink-0 sticky top-0 h-screen"><Sidebar /></div>{sidebarOpen && (<div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><div className="absolute left-0 top-0 h-full animate-slide-in"><Sidebar onClose={() => setSidebarOpen(false)} /></div></div>)}<div className="flex-1 flex flex-col min-w-0"><Topbar onMenu={() => setSidebarOpen(true)} /><main className="flex-1 overflow-y-auto pb-20 lg:pb-0"><Active /></main><BottomNav /></div></div>)
}
