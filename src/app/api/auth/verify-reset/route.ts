import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyResetToken } from '@/lib/auth'
import { json, errorJson } from '@/lib/api'
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')?.trim()
  if (!token) return errorJson('Token requerido', 422)
  const decoded = verifyResetToken(token)
  if (!decoded) return errorJson('Token inválido o expirado', 401)
  const user = await db.user.findFirst({ where: { id: decoded.uid, resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return errorJson('Token inválido o ya utilizado', 401)
  return json({ ok: true, username: user.username })
}
