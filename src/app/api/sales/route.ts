import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { getBusiness, nextInvoiceNumber } from '@/lib/settings'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

// GET /api/sales - historial con filtros
export async function GET(req: NextRequest) {
  const r = await requirePermission('sales.view')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || undefined
  const method = searchParams.get('method') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId') || undefined

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q } },
      { customer: { name: { contains: q } } },
    ]
  }
  if (status) where.status = status
  if (method) where.paymentMethod = method
  if (userId) where.userId = userId
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = new Date(from)
    if (to) {
      const t = new Date(to); t.setHours(23, 59, 59, 999); range.lte = t
    }
    where.createdAt = range
  }

  const sales = await db.sale.findMany({
    where,
    include: { customer: true, user: true, items: true, payments: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return json({ sales })
}

// POST /api/sales - registrar venta (POS checkout)
export async function POST(req: NextRequest) {
  const r = await requirePermission('sales.create')
  if ('error' in r) return r.error
  const body = await req.json()

  const items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; discount: number; isBundle?: boolean; bundleItems?: Array<{ productId: string; quantity: number }> }> = body.items || []
  if (!items.length) return errorJson('La venta no tiene productos', 422)

  const business = await getBusiness()
  const invoiceNumber = await nextInvoiceNumber()

  // Calcular totales
  let subtotal = 0
  for (const it of items) {
    subtotal += (it.quantity * it.unitPrice) - (it.discount || 0)
  }
  const discount = Number(body.discount) || 0
  const taxRate = business.taxRate || 0
  const taxable = subtotal - discount
  const tax = +(taxable * (taxRate / 100)).toFixed(2)
  const total = +(taxable + tax).toFixed(2)

  const payments: Array<{ method: string; amount: number; reference?: string }> = body.payments || []
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const isCredit = body.paymentMethod === 'credit'
  const creditBalance = isCredit ? Math.max(0, total - paidAmount) : Math.max(0, total - paidAmount)

  const customerId = body.customerId || null
  // Validar límite de crédito si es venta a crédito
  if (isCredit && customerId) {
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (customer) {
      const newBalance = customer.creditBalance + creditBalance
      if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
        return errorJson(`Crédito insuficiente. Saldo actual ${customer.creditBalance}, límite ${customer.creditLimit}`, 400)
      }
    }
  }

  // Crear venta en transacción
  const sale = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId,
        userId: r.user.id,
        subtotal: +subtotal.toFixed(2),
        discount,
        tax,
        total,
        paidAmount: +paidAmount.toFixed(2),
        creditBalance: +creditBalance.toFixed(2),
        status: isCredit ? 'credit' : 'completed',
        paymentMethod: body.paymentMethod || 'cash',
        notes: body.notes || null,
        observations: body.observations || null,
      },
    })

    // Items + descontar stock
    for (const it of items) {
      const lineTotal = +((it.quantity * it.unitPrice) - (it.discount || 0)).toFixed(2)
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          total: lineTotal,
        },
      })

      if (it.isBundle && it.bundleItems?.length) {
        // descontar componentes del combo
        for (const comp of it.bundleItems) {
          await tx.product.update({
            where: { id: comp.productId },
            data: { stock: { decrement: comp.quantity * it.quantity } },
          })
          await tx.inventoryMovement.create({
            data: { productId: comp.productId, type: 'out', quantity: comp.quantity * it.quantity, reason: `Venta ${invoiceNumber} (combo)`, userId: r.user.id, refType: 'sale', refId: sale.id },
          })
        }
      } else {
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.quantity } },
        })
        await tx.inventoryMovement.create({
          data: { productId: it.productId, type: 'out', quantity: it.quantity, reason: `Venta ${invoiceNumber}`, userId: r.user.id, refType: 'sale', refId: sale.id },
        })
      }
    }

    // Pagos
    for (const p of payments) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          customerId: isCredit ? customerId : null,
          method: p.method,
          amount: Number(p.amount),
          reference: p.reference || null,
        },
      })
    }

    // Actualizar saldo del cliente si es crédito
    if (isCredit && customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: { creditBalance: { increment: creditBalance } },
      })
    } else if (customerId && paidAmount > total) {
      // pago con vuelto, no afecta saldo
    }

    return sale
  })

  await logAudit({ user: r.user, action: 'create', entity: 'sale', entityId: sale.id, saleId: sale.id, newValue: { invoiceNumber, total, paymentMethod: body.paymentMethod } })
  const full = await db.sale.findUnique({ where: { id: sale.id }, include: { items: true, payments: true, customer: true, user: true } })
  return json({ sale: full }, 201)
}
