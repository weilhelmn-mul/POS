import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('sales.view')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: true, payments: true, customer: true, user: true, auditLogs: true },
  })
  if (!sale) return errorJson('Venta no encontrada', 404)
  return json({ sale })
}

// Anular venta (void) - restaura stock
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('sales.void')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const reason = (body.reason as string) || 'Anulación'

  const sale = await db.sale.findUnique({ where: { id }, include: { items: true } })
  if (!sale) return errorJson('Venta no encontrada', 404)
  if (sale.status === 'voided') return errorJson('La venta ya está anulada', 400)

  await db.$transaction(async (tx) => {
    // restaurar stock
    for (const it of sale.items) {
      const product = await tx.product.findUnique({ where: { id: it.productId } })
      if (product?.isBundle) {
        const bundle = await tx.bundle.findUnique({ where: { productId: it.productId }, include: { items: true } })
        if (bundle) {
          for (const comp of bundle.items) {
            await tx.product.update({ where: { id: comp.productId }, data: { stock: { increment: comp.quantity * it.quantity } } })
            await tx.inventoryMovement.create({ data: { productId: comp.productId, type: 'in', quantity: comp.quantity * it.quantity, reason: `Anulación ${sale.invoiceNumber} (combo)`, userId: r.user.id, refType: 'sale', refId: sale.id } })
          }
        }
      } else {
        await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } })
        await tx.inventoryMovement.create({ data: { productId: it.productId, type: 'in', quantity: it.quantity, reason: `Anulación ${sale.invoiceNumber}`, userId: r.user.id, refType: 'sale', refId: sale.id } })
      }
    }
    // restaurar saldo de cliente si era crédito
    if (sale.customerId && sale.creditBalance > 0) {
      await tx.customer.update({ where: { id: sale.customerId }, data: { creditBalance: { decrement: sale.creditBalance } } })
    }
    await tx.sale.update({
      where: { id },
      data: { status: 'voided', voidReason: reason, voidedAt: new Date(), voidedBy: r.user.id },
    })
  })

  await logAudit({ user: r.user, action: 'void', entity: 'sale', entityId: id, saleId: id, newValue: { reason } })
  return json({ ok: true })
}
