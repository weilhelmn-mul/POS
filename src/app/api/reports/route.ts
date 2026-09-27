import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getBusiness } from '@/lib/settings'
import { computeProductStatus } from '@/lib/product-status'
import { json, errorJson } from '@/lib/api'

function rangeFrom(req: NextRequest): { from: Date; to: Date } {
  const { searchParams } = new URL(req.url)
  const preset = searchParams.get('range') || 'today'
  const now = new Date()
  const from = new Date(now); from.setHours(0, 0, 0, 0)
  let to = new Date(now); to.setHours(23, 59, 59, 999)
  switch (preset) {
    case 'today': break
    case 'yesterday': { from.setDate(from.getDate() - 1); to.setDate(to.getDate() - 1); break }
    case 'week': { const d = new Date(now); const day = d.getDay(); from.setDate(d.getDate() - day); from.setHours(0, 0, 0, 0); break }
    case 'month': { from.setDate(1); from.setHours(0, 0, 0, 0); break }
    case 'last_month': { from.setMonth(now.getMonth() - 1); from.setDate(1); from.setHours(0, 0, 0, 0); to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); break }
    default: {
      const cf = searchParams.get('from'); const ct = searchParams.get('to')
      if (cf) { const f = new Date(cf); f.setHours(0, 0, 0, 0); return { from: f, to: ct ? (() => { const t = new Date(ct); t.setHours(23, 59, 59, 999); return t })() : to } }
    }
  }
  return { from, to }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'sales'
  const { from, to } = rangeFrom(req)
  const business = await getBusiness()

  if (type === 'sales' || type === 'profits') {
    const sales = await db.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: { not: 'voided' } }, include: { items: { include: { product: true } }, customer: true, user: true, payments: true } })
    if (type === 'sales') {
      const total = sales.reduce((s, x) => s + x.total, 0)
      const byMethod: Record<string, number> = {}
      for (const s of sales) for (const p of s.payments) byMethod[p.method] = (byMethod[p.method] || 0) + p.amount
      const byUser: Record<string, { name: string; total: number; count: number }> = {}
      for (const s of sales) {
        const k = s.user?.name || '—'
        byUser[k] = byUser[k] || { name: k, total: 0, count: 0 }
        byUser[k].total += s.total; byUser[k].count += 1
      }
      return json({ rows: sales.map((s) => ({ invoice: s.invoiceNumber, date: s.createdAt, customer: s.customer?.name || 'Consumidor', user: s.user?.name, total: s.total, method: s.paymentMethod, status: s.status })), total, count: sales.length, byMethod, byUser: Object.values(byUser) })
    }
    // profits
    let profit = 0
    const productProfit: Record<string, { name: string; qty: number; profit: number }> = {}
    for (const s of sales) for (const it of s.items) {
      const cost = it.product?.purchasePrice ?? 0
      const p = (it.unitPrice - cost) * it.quantity - it.discount
      profit += p
      productProfit[it.productId] = productProfit[it.productId] || { name: it.name, qty: 0, profit: 0 }
      productProfit[it.productId].qty += it.quantity; productProfit[it.productId].profit += p
    }
    const expenses = await db.expense.aggregate({ where: { createdAt: { gte: from, lte: to } }, _sum: { amount: true } })
    return json({ profit: +profit.toFixed(2), revenue: sales.reduce((s, x) => s + x.total, 0), expenses: expenses._sum.amount || 0, net: +(profit - (expenses._sum.amount || 0)).toFixed(2), topProducts: Object.values(productProfit).sort((a, b) => b.profit - a.profit).slice(0, 20) })
  }

  if (type === 'top_products') {
    const sales = await db.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: { not: 'voided' } }, include: { items: true } })
    const m: Record<string, { name: string; qty: number; total: number }> = {}
    for (const s of sales) for (const it of s.items) {
      m[it.productId] = m[it.productId] || { name: it.name, qty: 0, total: 0 }
      m[it.productId].qty += it.quantity; m[it.productId].total += it.total
    }
    return json({ rows: Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, 50) })
  }

  if (type === 'inventory') {
    const products = await db.product.findMany({ include: { category: true, brand: true } })
    const valorized = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0)
    return json({ rows: products.map((p) => ({ name: p.name, code: p.internalCode, stock: p.stock, cost: p.purchasePrice, value: p.stock * p.purchasePrice, category: p.category?.name || '', brand: p.brand?.name || '' })), valorized: +valorized.toFixed(2) })
  }

  if (type === 'low_stock' || type === 'out_stock' || type === 'near_expiry' || type === 'expired') {
    const products = await db.product.findMany({ include: { category: true, brand: true } })
    const filtered = products.filter((p) => {
      const st = computeProductStatus(p.stock, p.minStock, p.expiryDate, business.expiryAlertDays)
      if (type === 'low_stock') return st === 'low'
      if (type === 'out_stock') return st === 'out'
      if (type === 'near_expiry') return st === 'near_expiry'
      return st === 'expired'
    })
    return json({ rows: filtered.map((p) => ({ name: p.name, code: p.internalCode, stock: p.stock, min: p.minStock, expiry: p.expiryDate, category: p.category?.name || '', brand: p.brand?.name || '', location: [p.locationWarehouse, p.locationAisle, p.locationShelf, p.locationLevel].filter(Boolean).join(' / ') })) })
  }

  if (type === 'receivables') {
    const sales = await db.sale.findMany({ where: { status: 'credit', creditBalance: { gt: 0 } }, include: { customer: true } })
    return json({ rows: sales.map((s) => ({ invoice: s.invoiceNumber, customer: s.customer?.name || '—', document: s.customer?.document || '', phone: s.customer?.phone || '', date: s.createdAt, total: s.total, balance: s.creditBalance, customerId: s.customerId })), total: sales.reduce((s, x) => s + x.creditBalance, 0) })
  }

  if (type === 'purchases') {
    const purchases = await db.purchase.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { supplier: true, items: true, user: true }, orderBy: { createdAt: 'desc' } })
    return json({ rows: purchases.map((p) => ({ doc: p.documentNo, supplier: p.supplier?.name || '—', date: p.createdAt, total: p.total, user: p.user?.name, items: p.items.length })), total: purchases.reduce((s, x) => s + x.total, 0) })
  }

  if (type === 'expenses') {
    const expenses = await db.expense.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { user: true }, orderBy: { createdAt: 'desc' } })
    const byCat: Record<string, number> = {}
    for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount
    return json({ rows: expenses.map((e) => ({ category: e.category, description: e.description, amount: e.amount, date: e.createdAt, user: e.user?.name })), total: expenses.reduce((s, x) => s + x.amount, 0), byCategory: byCat })
  }

  return json({ error: 'Tipo de reporte no soportado' }, 400)
}
