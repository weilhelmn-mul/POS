'use client'
import { create } from 'zustand'
import type { SessionUser, PermissionKey } from '@/types'
interface AuthState { user: SessionUser | null; loading: boolean; fetchUser: () => Promise<void>; login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; hint?: string }>; logout: () => Promise<void>; has: (perm: PermissionKey) => boolean }
export const useAuth = create<AuthState>((set, get) => ({
  user: null, loading: true,
  fetchUser: async () => { try { const res = await fetch('/api/auth'); const data = await res.json(); set({ user: data.user, loading: false }) } catch { set({ user: null, loading: false }) } },
  login: async (username, password) => {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || 'Error al iniciar sesión', hint: data.hint }
    await get().fetchUser()
    return { ok: true }
  },
  logout: async () => { await fetch('/api/auth', { method: 'DELETE' }); set({ user: null }) },
  has: (perm) => { const u = get().user; if (!u) return false; if (u.role === 'admin') return true; return u.permissions.includes(perm) },
}))
