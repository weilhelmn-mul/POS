import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { setSession, clearSession, getCurrentUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { username, password } = body as { username?: string; password?: string }
  if (!username || !password) return errorJson('Usuario y contraseña requeridos', 422)

  const user = await db.user.findUnique({ where: { username } })
  if (!user || !user.active) return errorJson('Credenciales inválidas', 401)
  if (!verifyPassword(password, user.passwordHash)) return errorJson('Credenciales inválidas', 401)

  await setSession(user.id)
  await logAudit({ user: { id: user.id, username: user.username, name: user.name, role: user.role as 'admin' | 'vendor', permissions: [] }, action: 'login', entity: 'auth', ip: req.headers.get('x-forwarded-for') || 'unknown' })
  return json({ ok: true })
}

export async function DELETE() {
  await clearSession()
  return json({ ok: true })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return json({ user: null })
  return json({ user })
}
