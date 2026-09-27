import { db } from '@/lib/db'

interface BackupData {
  meta: { version: number; createdAt: string; counts: Record<string, number> }
  users: unknown[]
  categories: unknown[]
  brands: unknown[]
  suppliers: unknown[]
  products: unknown[]
  bundles: unknown[]
  bundleItems: unknown[]
  customers: unknown[]
  sales: unknown[]
  saleItems: unknown[]
  payments: unknown[]
  purchases: unknown[]
  purchaseItems: unknown[]
  expenses: unknown[]
  inventoryMovements: unknown[]
  auditLogs: unknown[]
  settings: unknown[]
}

export async function createBackup(): Promise<{ data: BackupData; json: string }> {
  const [
    users, categories, brands, suppliers, products, bundles, bundleItems,
    customers, sales, saleItems, payments, purchases, purchaseItems,
    expenses, inventoryMovements, auditLogs, settings,
  ] = await Promise.all([
    db.user.findMany(),
    db.category.findMany(),
    db.brand.findMany(),
    db.supplier.findMany(),
    db.product.findMany(),
    db.bundle.findMany(),
    db.bundleItem.findMany(),
    db.customer.findMany(),
    db.sale.findMany(),
    db.saleItem.findMany(),
    db.payment.findMany(),
    db.purchase.findMany(),
    db.purchaseItem.findMany(),
    db.expense.findMany(),
    db.inventoryMovement.findMany(),
    db.auditLog.findMany(),
    db.setting.findMany(),
  ])

  const counts = {
    users: users.length, categories: categories.length, brands: brands.length,
    suppliers: suppliers.length, products: products.length, bundles: bundles.length,
    customers: customers.length, sales: sales.length, payments: payments.length,
    purchases: purchases.length, expenses: expenses.length,
  }

  const data: BackupData = {
    meta: { version: 1, createdAt: new Date().toISOString(), counts },
    users, categories, brands, suppliers, products, bundles, bundleItems,
    customers, sales, saleItems, payments, purchases, purchaseItems,
    expenses, inventoryMovements, auditLogs, settings,
  }

  return { data, json: JSON.stringify(data, null, 2) }
}

// Restaurar: valida estructura y reemplaza datos
export async function restoreBackup(json: string, opts: { replaceUsers?: boolean } = {}): Promise<{ ok: boolean; counts: Record<string, number>; error?: string }> {
  let data: BackupData
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, counts: {}, error: 'JSON inválido' }
  }
  if (!data.meta || !data.products) {
    return { ok: false, counts: {}, error: 'Estructura de backup inválida' }
  }

  // Ejecutar en transacción para reemplazo seguro
  await db.$transaction(async (tx) => {
    const order: Array<[string, Array<Record<string, unknown>>]> = [
      ['auditLog', data.auditLogs as Array<Record<string, unknown>>],
      ['payment', data.payments as Array<Record<string, unknown>>],
      ['saleItem', data.saleItems as Array<Record<string, unknown>>],
      ['sale', data.sales as Array<Record<string, unknown>>],
      ['purchaseItem', data.purchaseItems as Array<Record<string, unknown>>],
      ['purchase', data.purchases as Array<Record<string, unknown>>],
      ['expense', data.expenses as Array<Record<string, unknown>>],
      ['inventoryMovement', data.inventoryMovements as Array<Record<string, unknown>>],
      ['bundleItem', data.bundleItems as Array<Record<string, unknown>>],
      ['bundle', data.bundles as Array<Record<string, unknown>>],
      ['product', data.products as Array<Record<string, unknown>>],
      ['customer', data.customers as Array<Record<string, unknown>>],
      ['supplier', data.suppliers as Array<Record<string, unknown>>],
      ['brand', data.brands as Array<Record<string, unknown>>],
      ['category', data.categories as Array<Record<string, unknown>>],
      ['setting', data.settings as Array<Record<string, unknown>>],
    ]
    if (opts.replaceUsers) order.push(['user', data.users as Array<Record<string, unknown>>])

    // limpiar y reinsertar (preserva IDs para mantener relaciones)
    for (const [model, rows] of order) {
      // @ts-expect-error dynamic model
      await tx[model].deleteMany({})
    }
    for (const [model, rows] of order) {
      for (const row of rows) {
        // @ts-expect-error dynamic model
        await tx[model].create({ data: row })
      }
    }
  })

  return {
    ok: true,
    counts: {
      products: data.products.length, customers: data.customers.length,
      sales: data.sales.length, users: data.users.length,
    },
  }
}
