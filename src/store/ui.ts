'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export type ModuleKey = 'dashboard' | 'pos' | 'products' | 'categories' | 'customers' | 'sales' | 'purchases' | 'expenses' | 'reports' | 'users' | 'audit' | 'backup' | 'export' | 'settings' | 'receivables'
export type ThemeMode = 'light' | 'dark' | 'system'
interface UIState {
  module: ModuleKey
  setModule: (m: ModuleKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (o: boolean) => void
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
  // Sidebar collapsed (desktop): solo iconos en w-16
  sidebarCollapsed: boolean
  setSidebarCollapsed: (c: boolean) => void
  toggleSidebarCollapsed: () => void
  // POS layout collapsible
  productsCollapsed: boolean
  toggleProductsCollapsed: () => void
  cartCollapsed: boolean
  toggleCartCollapsed: () => void
  // Scanner
  scannerEnabled: boolean
  setScannerEnabled: (v: boolean) => void
  toggleScanner: () => void
}
export const useUI = create<UIState>()(persist((set, get) => ({
  module: 'pos', setModule: (module) => set({ module, sidebarOpen: false }),
  sidebarOpen: false, setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  theme: 'dark', setTheme: (theme) => set({ theme }),
  toggleTheme: () => { const cur = get().theme; const next: ThemeMode = cur === 'dark' ? 'light' : 'dark'; set({ theme: next }) },
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebarCollapsed: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  productsCollapsed: false,
  toggleProductsCollapsed: () => set({ productsCollapsed: !get().productsCollapsed }),
  cartCollapsed: false,
  toggleCartCollapsed: () => set({ cartCollapsed: !get().cartCollapsed }),
  scannerEnabled: true,
  setScannerEnabled: (scannerEnabled) => set({ scannerEnabled }),
  toggleScanner: () => set({ scannerEnabled: !get().scannerEnabled }),
}), { name: 'pos-ui' }))

