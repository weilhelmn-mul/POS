import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { getBusiness } from '@/lib/settings'
import { computeProductStatus } from '@/lib/product-status'
import { generateEan13, generateInternalCode } from '@/lib/settings'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(req: NextRequest) {
  const r = await requirePermission('products.view')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') || undefined
  const status = searchParams.get('status') || undefined
  const lowOnly = searchParams.get('low') === '1'
  const favoritesOnly = searchParams.get('favorites') === '1'

  const business = await getBusiness()
  const where: Record<string, unknown> = {}
  // Filtrar productos eliminados (soft-delete) por defecto
  // Solo se muestran si el cliente pasa ?includeDiscontinued=1
  if (searchParams.get('includeDiscontinued') !== '1') {
    where.status = { not: 'discontinued' }
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { internalCode: { contains: q } },
      { barcode: { contains: q } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (lowOnly) where.stock = { lte: 0 }
  if (favoritesOnly) where.isFavorite = true

  const products = await db.product.findMany({
    where,
    include: { category: true, brand: true, supplier: true, bundle: { include: { items: { include: { product: true } } } } },
    orderBy: { name: 'asc' },
    take: 500,
  })

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    internalCode: p.internalCode,
    barcode: p.barcode,
    gs1Code: p.gs1Code,
    image: p.image,
    stock: p.stock,
    minStock: p.minStock,
    salePrice: p.salePrice,
    purchasePrice: p.purchasePrice,
    wholesalePrice: p.wholesalePrice,
    unit: p.unit,
    expiryDate: p.expiryDate,
    status: computeProductStatus(p.stock, p.minStock, p.expiryDate, business.expiryAlertDays),
    isBundle: p.isBundle,
    isFavorite: p.isFavorite,
    categoryName: p.category?.name ?? null,
    brandName: p.brand?.name ?? null,
    supplierName: p.supplier?.name ?? null,
    locationWarehouse: p.locationWarehouse,
    locationAisle: p.locationAisle,
    locationShelf: p.locationShelf,
    locationLevel: p.locationLevel,
    lot: p.lot,
    bundleItems: p.bundle?.items.map((it) => ({ productId: it.productId, name: it.product.name, quantity: it.quantity, stock: it.product.stock })) ?? [],
  }))

  const filtered = status ? rows.filter((r) => r.status === status) : rows
  return json({ products: filtered })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('products.create')
  if ('error' in r) return r.error
  const body = await req.json()
  const count = await db.product.count()
  const internalCode = body.internalCode || generateInternalCode(count + 1)
  const barcode = body.barcode || generateEan13('20')

  const product = await db.product.create({
    data: {
      name: body.name,
      internalCode,
      barcode,
      gs1Code: body.gs1Code || null,
      image: body.image || null,
      categoryId: body.categoryId || null,
      brandId: body.brandId || null,
      supplierId: body.supplierId || null,
      purchasePrice: Number(body.purchasePrice) || 0,
      salePrice: Number(body.salePrice) || 0,
      wholesalePrice: Number(body.wholesalePrice) || 0,
      stock: Number(body.stock) || 0,
      minStock: Number(body.minStock) || 0,
      unit: body.unit || 'unidad',
      locationWarehouse: body.locationWarehouse || null,
      locationAisle: body.locationAisle || null,
      locationShelf: body.locationShelf || null,
      locationLevel: body.locationLevel || null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      lot: body.lot || null,
      isFavorite: !!body.isFavorite,
    },
  })

  if (product.stock > 0) {
    await db.inventoryMovement.create({
      data: { productId: product.id, type: 'in', quantity: product.stock, reason: 'Stock inicial', userId: r.user.id },
    })
  }

  if (body.isBundle && Array.isArray(body.bundleItems) && body.bundleItems.length) {
    const bundle = await db.bundle.create({ data: { productId: product.id, price: Number(body.salePrice) || 0 } })
    await db.bundleItem.createMany({
      data: body.bundleItems.map((it: { productId: string; quantity: number }) => ({
        bundleId: bundle.id, productId: it.productId, quantity: Number(it.quantity) || 1,
      })),
    })
    await db.product.update({ where: { id: product.id }, data: { isBundle: true } })
  }

  await logAudit({ user: r.user, action: 'create', entity: 'product', entityId: product.id, newValue: product })
  return json({ product }, 201)
}
