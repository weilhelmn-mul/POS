import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(req: NextRequest) {
  const r = await requirePermission('expenses.create')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where: Record<string, unknown> = {}
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = new Date(from)
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); range.lte = t }
    where.createdAt = range
  }
  const expenses = await db.expense.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, take: 500 })
  return json({ expenses })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('expenses.create')
  if ('error' in r) return r.error
  const body = await req.json()
  if (!body.amount || !body.description) return errorJson('Monto y descripción requeridos', 422)
  const expense = await db.expense.create({
    data: {
      category: body.category || 'otros',
      description: body.description,
      amount: Number(body.amount),
      userId: r.user.id,
    },
  })
  await logAudit({ user: r.user, action: 'create', entity: 'expense', entityId: expense.id, newValue: expense })
  return json({ expense }, 201)
}
