import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { hashPassword } from '@/lib/auth'
import { ALL_PERMISSIONS, parsePermissions } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET() {
  const r = await requirePermission('users.manage')
  if ('error' in r) return r.error
  const users = await db.user.findMany({ orderBy: { name: 'asc' } })
  return json({ users: users.map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, permissions: parsePermissions(u.permissions), active: u.active, hasAuthPassword: !!u.authPassword, email: u.email, phone: u.phone, createdAt: u.createdAt })), permissions: ALL_PERMISSIONS })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('users.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  if (!body.username || !body.password || !body.name) return errorJson('Usuario, contraseña y nombre requeridos', 422)
  const exists = await db.user.findUnique({ where: { username: body.username } })
  if (exists) return errorJson('El usuario ya existe', 409)
  const user = await db.user.create({
    data: {
      username: body.username,
      passwordHash: hashPassword(body.password),
      name: body.name,
      role: body.role === 'admin' ? 'admin' : 'vendor',
      permissions: body.role === 'admin' ? JSON.stringify([]) : JSON.stringify(body.permissions || []),
      authPassword: body.authPassword ? hashPassword(body.authPassword) : null,
      email: body.email || null,
      phone: body.phone || null,
      active: body.active !== false,
    },
  })
  await logAudit({ user: r.user, action: 'create', entity: 'user', entityId: user.id, newValue: { username: user.username, role: user.role } })
  return json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } }, 201)
}
