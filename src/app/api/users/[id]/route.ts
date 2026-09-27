import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('users.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const before = await db.user.findUnique({ where: { id } })
  if (!before) return errorJson('Usuario no encontrado', 404)

  const data: Record<string, unknown> = {
    name: body.name,
    role: body.role === 'admin' ? 'admin' : 'vendor',
    active: body.active !== false,
    email: body.email || null,
    phone: body.phone || null,
  }
  if (body.role === 'vendor') {
    data.permissions = JSON.stringify(body.permissions || [])
  }
  if (body.password) {
    data.passwordHash = hashPassword(body.password)
  }
  if (body.authPassword !== undefined) {
    data.authPassword = body.authPassword ? hashPassword(body.authPassword) : null
  }

  const user = await db.user.update({ where: { id }, data })
  await logAudit({ user: r.user, action: 'update', entity: 'user', entityId: id, oldValue: { name: before.name, role: before.role }, newValue: { name: user.name, role: user.role } })
  return json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('users.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  if (r.user.id === id) return errorJson('No puedes eliminarte a ti mismo', 400)
  await db.user.delete({ where: { id } })
  await logAudit({ user: r.user, action: 'delete', entity: 'user', entityId: id })
  return json({ ok: true })
}
