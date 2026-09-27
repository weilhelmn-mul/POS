import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json, errorJson } from '@/lib/api'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('categories.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const body = await req.json()
  const cat = await db.category.update({ where: { id }, data: { name: body.name, parentId: body.parentId || null } })
  return json({ category: cat })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('categories.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const products = await db.product.count({ where: { categoryId: id } })
  if (products > 0) return errorJson('La categoría tiene productos asociados', 409)
  await db.category.delete({ where: { id } })
  return json({ ok: true })
}
