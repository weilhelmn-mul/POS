import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getBusiness } from '@/lib/settings'
import { computeProductStatus } from '@/lib/product-status'
import { json, errorJson } from '@/lib/api'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)

  const business = await getBusiness()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todaySales, monthSales, products, customers, expensesToday, expensesMonth, alertsSales] = await Promise.all([
    db.sale.findMany({ where: { createdAt: { gte: todayStart }, status: { not: 'voided' } }, include: { items: true } }),
    db.sale.findMany({ where: { createdAt: { gte: monthStart }, status: { not: 'voided' } }, include: { items: true } }),
    db.product.findMany(),
    db.customer.findMany(),
    db.expense.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.sale.findMany({ where: { status: 'credit', creditBalance: { gt: 0 } }, include: { customer: true } }),
  ])

  const todayTotal = todaySales.reduce((s, x) => s + x.total, 0)
  const monthTotal = monthSales.reduce((s, x) => s + x.total, 0)
  const todayProfit = todaySales.reduce((s, sale) => {
    return s + sale.items.reduce((p, it) => {
      const prod = products.find((pp) => pp.id === it.productId)
      const cost = prod?.purchasePrice ?? 0
      return p + (it.unitPrice - cost) * it.quantity - it.discount
    }, 0)
  }, 0)
  const monthProfit = monthSales.reduce((s, sale) => {
    return s + sale.items.reduce((p, it) => {
      const prod = products.find((pp) => pp.id === it.productId)
      const cost = prod?.purchasePrice ?? 0
      return p + (it.unitPrice - cost) * it.quantity - it.discount
    }, 0)
  }, 0)

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length
  const outStock = products.filter((p) => p.stock <= 0 && !p.isBundle).length
  const nearExpiry = products.filter((p) => {
    if (!p.expiryDate) return false
    const st = computeProductStatus(p.stock, p.minStock, p.expiryDate, business.expiryAlertDays)
    return st === 'near_expiry'
  }).length
  const expired = products.filter((p) => p.expiryDate && new Date(p.expiryDate) < now).length
  const totalReceivables = alertsSales.reduce((s, x) => s + x.creditBalance, 0)
  const customersWithDebt = alertsSales.filter((s) => s.customerId).length

  // ventas por hora (hoy)
  const salesByHour = Array.from({ length: 24 }, (_, h) => {
    const hSales = todaySales.filter((s) => s.createdAt.getHours() === h)
    return { hour: h, total: hSales.reduce((a, b) => a + b.total, 0), count: hSales.length }
  })

  // ventas últimos 7 días
  const days = 7
  const salesByDay: Array<{ label: string; total: number; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    const list = monthSales.concat().filter((s) => s.createdAt >= start && s.createdAt <= end)
    if (i < days - monthSales.length / 24) {
      // consultar directos para hoy y ayer más preciso
    }
    salesByDay.push({
      label: d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit' }),
      total: list.reduce((a, b) => a + b.total, 0),
      count: list.length,
    })
  }
  // mejor traer ventas de 7 días directamente
  const sevenAgo = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0, 0, 0, 0)
  const weekSales = await db.sale.findMany({ where: { createdAt: { gte: sevenAgo }, status: { not: 'voided' } } })
  const salesByDay2: Array<{ label: string; total: number; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    const list = weekSales.filter((s) => s.createdAt >= start && s.createdAt <= end)
    salesByDay2.push({
      label: d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit' }),
      total: list.reduce((a, b) => a + b.total, 0),
      count: list.length,
    })
  }

  return json({
    todayTotal: +todayTotal.toFixed(2),
    monthTotal: +monthTotal.toFixed(2),
    todayProfit: +todayProfit.toFixed(2),
    monthProfit: +monthProfit.toFixed(2),
    todayCount: todaySales.length,
    monthCount: monthSales.length,
    expensesToday: expensesToday._sum.amount || 0,
    expensesMonth: expensesMonth._sum.amount || 0,
    totalProducts: products.length,
    totalCustomers: customers.length,
    lowStock, outStock, nearExpiry, expired,
    totalReceivables: +totalReceivables.toFixed(2),
    customersWithDebt,
    salesByHour,
    salesByDay: salesByDay2,
  })
}
