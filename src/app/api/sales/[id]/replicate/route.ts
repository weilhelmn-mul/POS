import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json, errorJson } from '@/lib/api'

// Devuelve los datos de una venta para replicar (NO modifica la original)
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('sales.create')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const sale = await db.sale.findUnique({ where: { id }, include: { items: { include: { product: true } }, customer: true } })
  if (!sale) return errorJson('Venta no encontrada', 404)
  return json({
    items: sale.items.map((it) => ({
      productId: it.productId,
      name: it.product?.name || it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      image: it.product?.image || null,
      stock: it.product?.stock || 0,
      isBundle: it.product?.isBundle || false,
    })),
    customerId: sale.customerId,
    customerName: sale.customer?.name || '',
    observations: sale.observations,
  })
}
