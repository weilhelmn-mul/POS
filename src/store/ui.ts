'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleKey =
  | 'dashboard' | 'pos' | 'products' | 'categories' | 'customers' | 'sales'
  | 'purchases' | 'expenses' | 'reports' | 'users' | 'audit' | 'backup' | 'export' | 'settings' | 'receivables'

interface UIState {
  module: ModuleKey
  setModule: (m: ModuleKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (o: boolean) => void
  theme: 'light' | 'dark' | 'blue' | 'green' | 'pro'
  setTheme: (t: 'light' | 'dark' | 'blue' | 'green' | 'pro') => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      module: 'dashboard',
      setModule: (module) => set({ module, sidebarOpen: false }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'pos-ui' },
  ),
)
