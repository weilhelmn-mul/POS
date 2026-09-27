import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json } from '@/lib/api'

export async function GET(req: NextRequest) {
  const r = await requirePermission('audit.view')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const entity = searchParams.get('entity') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const where: Record<string, unknown> = {}
  if (entity) where.entity = entity
  if (q) where.action = { contains: q }
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = new Date(from)
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); range.lte = t }
    where.createdAt = range
  }
  const logs = await db.auditLog.findMany({ where, include: { user: true, authorizedBy: true }, orderBy: { createdAt: 'desc' }, take: 500 })
  return json({ logs })
}
