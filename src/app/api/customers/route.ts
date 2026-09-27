import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'
export async function GET(req: NextRequest) {
  const r = await requirePermission('customers.create')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const withDebt = searchParams.get('withDebt') === '1'
  const where: Record<string, unknown> = {}
  if (q) where.OR = [{ name: { contains: q } }, { document: { contains: q } }, { phone: { contains: q } }]
  if (withDebt) where.creditBalance = { gt: 0 }
  const customers = await db.customer.findMany({ where, orderBy: { name: 'asc' }, take: 500 })
  return json({ customers })
}
export async function POST(req: NextRequest) {
  const r = await requirePermission('customers.create')
  if ('error' in r) return r.error
  const body = await req.json()
  if (body.document && String(body.document).trim()) {
    const existing = await db.customer.findFirst({ where: { document: { equals: String(body.document).trim() } }, select: { id: true, name: true } })
    if (existing) return errorJson(`Ya existe un cliente con documento "${body.document}": ${existing.name}`, 409)
  }
  try {
    const customer = await db.customer.create({ data: { name: body.name, document: body.document || null, phone: body.phone || null, email: body.email || null, address: body.address || null, creditLimit: Number(body.creditLimit) || 0, notes: body.notes || null } })
    await logAudit({ user: r.user, action: 'create', entity: 'customer', entityId: customer.id, newValue: customer })
    return json({ customer }, 201)
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('document')) return errorJson('DNI/RUC ya registrado', 409)
    throw e
  }
}
