import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json } from '@/lib/api'

export async function GET() {
  const categories = await db.category.findMany({ include: { parent: true, children: true, _count: { select: { products: true } } }, orderBy: { name: 'asc' } })
  return json({ categories })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('categories.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  const cat = await db.category.create({ data: { name: body.name, parentId: body.parentId || null } })
  return json({ category: cat }, 201)
}
