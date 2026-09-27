import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('products.view')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true, brand: true, supplier: true, bundle: { include: { items: { include: { product: true } } } }, movements: { take: 50, orderBy: { createdAt: 'desc' } } },
  })
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
      gs1Code: body.gs1Code || null,
      image: body.image ?? before.image,
      categoryId: body.categoryId || null,
      brandId: body.brandId || null,
      supplierId: body.supplierId || null,
      purchasePrice: Number(body.purchasePrice) ?? before.purchasePrice,
      salePrice: Number(body.salePrice) ?? before.salePrice,
      wholesalePrice: Number(body.wholesalePrice) ?? before.wholesalePrice,
      stock: newStock,
      minStock: Number(body.minStock) ?? before.minStock,
      unit: body.unit || before.unit,
      locationWarehouse: body.locationWarehouse || null,
      locationAisle: body.locationAisle || null,
      locationShelf: body.locationShelf || null,
      locationLevel: body.locationLevel || null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      lot: body.lot || null,
      isFavorite: body.isFavorite ?? before.isFavorite,
    },
  })

  // Si el stock cambió, registrar movimiento de ajuste
  if (newStock !== oldStock) {
    const diff = newStock - oldStock
    await db.inventoryMovement.create({
      data: { productId: id, type: 'adjust', quantity: diff, reason: body.adjustReason || 'Ajuste manual', userId: r.user.id },
    })
  }

  // Actualizar combo si es bundle
  if (body.isBundle && Array.isArray(body.bundleItems)) {
    const existing = await db.bundle.findUnique({ where: { productId: id } })
    if (existing) {
      await db.bundleItem.deleteMany({ where: { bundleId: existing.id } })
      if (body.bundleItems.length) {
        await db.bundleItem.createMany({
          data: body.bundleItems.map((it: { productId: string; quantity: number }) => ({
            bundleId: existing.id, productId: it.productId, quantity: Number(it.quantity) || 1,
          })),
        })
      }
    } else {
      const bundle = await db.bundle.create({ data: { productId: id, price: Number(body.salePrice) || 0 } })
      if (body.bundleItems.length) {
        await db.bundleItem.createMany({
          data: body.bundleItems.map((it: { productId: string; quantity: number }) => ({
            bundleId: bundle.id, productId: it.productId, quantity: Number(it.quantity) || 1,
          })),
        })
      }
    }
    await db.product.update({ where: { id }, data: { isBundle: true } })
  }

  await logAudit({ user: r.user, action: 'update', entity: 'product', entityId: id, oldValue: before, newValue: updated })
  return json({ product: updated })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('products.delete')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const before = await db.product.findUnique({ where: { id } })
  if (!before) return errorJson('Producto no encontrado', 404)
  await db.product.delete({ where: { id } })
  await logAudit({ user: r.user, action: 'delete', entity: 'product', entityId: id, oldValue: before })
  return json({ ok: true })
}
