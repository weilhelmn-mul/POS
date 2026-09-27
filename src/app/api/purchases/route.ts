import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(req: NextRequest) {
  const r = await requirePermission('purchases.create')
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
  const purchases = await db.purchase.findMany({ where, include: { supplier: true, user: true, items: true }, orderBy: { createdAt: 'desc' }, take: 500 })
  return json({ purchases })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('purchases.create')
  if ('error' in r) return r.error
  const body = await req.json()
  const items: Array<{ productId: string; name: string; quantity: number; unitCost: number }> = body.items || []
  if (!items.length) return errorJson('La compra no tiene productos', 422)
  let total = 0
  for (const it of items) total += it.quantity * it.unitCost

  const purchase = await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: body.supplierId || null,
        documentNo: body.documentNo || null,
        userId: r.user.id,
        total: +total.toFixed(2),
        attachment: body.attachment || null,
        notes: body.notes || null,
      },
    })
    for (const it of items) {
      const lineTotal = it.quantity * it.unitCost
      await tx.purchaseItem.create({
        data: { purchaseId: purchase.id, productId: it.productId, name: it.name, quantity: it.quantity, unitCost: it.unitCost, total: lineTotal },
      })
      // aumentar stock y actualizar precio de compra
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity }, purchasePrice: it.unitCost },
      })
      await tx.inventoryMovement.create({
        data: { productId: it.productId, type: 'purchase', quantity: it.quantity, reason: `Compra ${purchase.documentNo || purchase.id}`, userId: r.user.id, refType: 'purchase', refId: purchase.id },
      })
    }
    return purchase
  })

  await logAudit({ user: r.user, action: 'create', entity: 'purchase', entityId: purchase.id, newValue: { total } })
  return json({ purchase }, 201)
}
