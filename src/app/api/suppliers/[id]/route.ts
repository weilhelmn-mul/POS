import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json, errorJson } from '@/lib/api'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('suppliers.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const supplier = await db.supplier.update({
    where: { id },
    data: {
      name: body.name, document: body.document || null, phone: body.phone || null,
      email: body.email || null, address: body.address || null, contact: body.contact || null, notes: body.notes || null,
    },
  })
  return json({ supplier })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('suppliers.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  await db.supplier.delete({ where: { id } })
  return json({ ok: true })
}
