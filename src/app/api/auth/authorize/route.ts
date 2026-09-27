import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { getCurrentUser } from '@/lib/session'
import { json, errorJson } from '@/lib/api'

// Verifica contraseña secundaria de autorización para operaciones sensibles
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)
  const body = await req.json().catch(() => ({}))
  const { password } = body as { password?: string }
  if (!password) return errorJson('Contraseña requerida', 422)

  const admin = await db.user.findUnique({ where: { id: user.id } })
  if (!admin) return errorJson('Usuario no encontrado', 404)

  const stored = admin.authPassword || admin.passwordHash
  if (!verifyPassword(password, stored)) {
    return errorJson('Contraseña de autorización incorrecta', 403)
  }
  return json({ ok: true, authorizedById: user.id })
}
