import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyResetToken, hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = (body?.token as string | undefined)?.trim()
  const password = (body?.password as string | undefined) || ''
  if (!token) return errorJson('Token requerido', 422)
  if (password.length < 8) return errorJson('La contraseña debe tener al menos 8 caracteres', 422)
  const decoded = verifyResetToken(token)
  if (!decoded) return errorJson('El enlace ha expirado o es inválido', 401)
  const user = await db.user.findFirst({ where: { id: decoded.uid, resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return errorJson('El enlace ha expirado o ya fue utilizado', 401)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password), resetToken: null, resetTokenExpiry: null, failedLoginAttempts: 0, lockedUntil: null } })
  await logAudit({ user: { id: user.id, username: user.username, name: user.name, role: user.role as any, permissions: [] }, action: 'password.reset.complete', entity: 'auth', ip: req.headers.get('x-forwarded-for') || 'unknown' } as any).catch(() => {})
  return json({ ok: true, message: 'Contraseña actualizada correctamente' })
}
