import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('products.view')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const product = await db.product.findUnique({ where: { id }, include: { category: true, brand: true, supplier: true, bundle: { include: { items: { include: { product: true } } } }, movements: { take: 50, orderBy: { createdAt: 'desc' } } } })
  if (!product) return errorJson('Producto no encontrado', 404)
  return json({ product })
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('products.edit')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const before = await db.product.findUnique({ where: { id } })
  if (!before) return errorJson('Producto no encontrado', 404)
  const oldStock = before.stock
  const newStock = body.stock !== undefined ? Number(body.stock) : oldStock
  const updated = await db.product.update({
    where: { id },
    data: {
      name: body.name,
      barcode: body.barcode !== undefined ? (body.barcode === '' ? null : String(body.barcode)) : before.barcode,
      gs1Code: body.gs1Code || null,
      image: body.image ?? before.image,
      categoryId: body.categoryId === undefined ? before.categoryId : (body.categoryId === null ? null : body.categoryId),
      brandId: body.brandId === undefined ? before.brandId : (body.brandId === null ? null : body.brandId),
      supplierId: body.supplierId === undefined ? before.supplierId : (body.supplierId === null ? null : body.supplierId),
      purchasePrice: !isNaN(Number(body.purchasePrice)) ? Number(body.purchasePrice) : before.purchasePrice,
      salePrice: !isNaN(Number(body.salePrice)) ? Number(body.salePrice) : before.salePrice,
      wholesalePrice: !isNaN(Number(body.wholesalePrice)) ? Number(body.wholesalePrice) : before.wholesalePrice,
      stock: newStock,
      minStock: !isNaN(Number(body.minStock)) ? Number(body.minStock) : before.minStock,
      unit: body.unit || before.unit,
      locationWarehouse: body.locationWarehouse ?? before.locationWarehouse,
      locationAisle: body.locationAisle ?? before.locationAisle,
      locationShelf: body.locationShelf ?? before.locationShelf,
      locationLevel: body.locationLevel ?? before.locationLevel,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : (body.expiryDate === null ? null : before.expiryDate),
      lot: body.lot ?? before.lot,
      isFavorite: body.isFavorite ?? before.isFavorite,
    },
  })
  if (newStock !== oldStock) {
    const diff = newStock - oldStock
    await db.inventoryMovement.create({ data: { productId: id, type: 'adjust', quantity: diff, reason: body.adjustReason || 'Ajuste manual', userId: r.user.id } })
  }
  await logAudit({ user: r.user, action: 'update', entity: 'product', entityId: id, oldValue: before, newValue: updated })
  return json({ product: updated })
}
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('products.delete')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  await db.product.delete({ where: { id } })
  await logAudit({ user: r.user, action: 'delete', entity: 'product', entityId: id })
  return json({ ok: true })
}
