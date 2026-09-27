import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import type { PermissionKey, SessionUser } from '@/types'

export interface ApiCtx {
  user: SessionUser
}

export async function requireUser(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }
  return { user }
}

export async function requirePermission(perm: PermissionKey): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const r = await requireUser()
  if ('error' in r) return r
  if (r.user.role !== 'admin' && !r.user.permissions.includes(perm)) {
    return { error: NextResponse.json({ error: 'Sin permisos', required: perm }, { status: 403 }) }
  }
  return r
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
