import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

// Registrar abono (pago) a una venta a crédito
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('customers.credit')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const amount = Number(body.amount)
  if (!amount || amount <= 0) return errorJson('Monto inválido', 422)

  const sale = await db.sale.findUnique({ where: { id } })
  if (!sale) return errorJson('Venta no encontrada', 404)
  if (sale.status === 'voided') return errorJson('Venta anulada', 400)
  if (sale.creditBalance <= 0) return errorJson('La venta no tiene saldo pendiente', 400)
  if (amount > sale.creditBalance) return errorJson(`El abono excede el saldo (${sale.creditBalance})`, 400)

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: { saleId: sale.id, customerId: sale.customerId, method: body.method || 'cash', amount, reference: body.reference || null },
    })
    await tx.sale.update({ where: { id }, data: { paidAmount: { increment: amount }, creditBalance: { decrement: amount } } })
    if (sale.customerId) {
      await tx.customer.update({ where: { id: sale.customerId }, data: { creditBalance: { decrement: amount } } })
    }
  })

  await logAudit({ user: r.user, action: 'payment', entity: 'sale', entityId: id, saleId: id, newValue: { amount, method: body.method } })
  return json({ ok: true })
}
