import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json } from '@/lib/api'

// Cuentas por cobrar - resumen por cliente
export async function GET() {
  const r = await requirePermission('receivables.view')
  if ('error' in r) return r.error
  const customers = await db.customer.findMany({
    where: { creditBalance: { gt: 0 } },
    include: { sales: { where: { status: 'credit', creditBalance: { gt: 0 } }, orderBy: { createdAt: 'desc' } } },
    orderBy: { creditBalance: 'desc' },
  })
  return json({
    customers: customers.map((c) => ({
      id: c.id, name: c.name, document: c.document, phone: c.phone,
      balance: c.creditBalance, limit: c.creditLimit,
      sales: c.sales.map((s) => ({ id: s.id, invoice: s.invoiceNumber, date: s.createdAt, total: s.total, balance: s.creditBalance })),
    })),
    total: customers.reduce((s, c) => s + c.creditBalance, 0),
  })
}
