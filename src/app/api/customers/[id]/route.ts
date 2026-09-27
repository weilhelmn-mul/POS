import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('customers.create')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      sales: { include: { items: true, user: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      payments: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!customer) return errorJson('Cliente no encontrado', 404)
  return json({ customer })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('customers.edit')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const before = await db.customer.findUnique({ where: { id } })
  const customer = await db.customer.update({
    where: { id },
    data: {
      name: body.name, document: body.document || null, phone: body.phone || null,
      email: body.email || null, address: body.address || null,
      creditLimit: Number(body.creditLimit) ?? before?.creditLimit ?? 0, notes: body.notes || null,
    },
  })
  await logAudit({ user: r.user, action: 'update', entity: 'customer', entityId: id, oldValue: before, newValue: customer })
  return json({ customer })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('customers.delete')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const before = await db.customer.findUnique({ where: { id } })
  if (!before) return errorJson('Cliente no encontrado', 404)
  await db.customer.delete({ where: { id } })
  await logAudit({ user: r.user, action: 'delete', entity: 'customer', entityId: id, oldValue: before })
  return json({ ok: true })
}
