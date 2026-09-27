import { cookies } from 'next/headers'
import { createSessionToken, readSessionToken, getSessionUser, SESSION_COOKIE } from '@/lib/auth'
import type { SessionUser } from '@/types'

export async function setSession(userId: string): Promise<void> {
  const token = createSessionToken(userId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const data = readSessionToken(token)
  if (!data) return null
  // opcional: expiración
  const ageDays = (Date.now() - data.ts) / (1000 * 60 * 60 * 24)
  if (ageDays > 7) return null
  return getSessionUser(data.uid)
}
