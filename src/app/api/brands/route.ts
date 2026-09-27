import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json } from '@/lib/api'

export async function GET() {
  const brands = await db.brand.findMany({ orderBy: { name: 'asc' } })
  return json({ brands })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('categories.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  const brand = await db.brand.create({ data: { name: body.name } })
  return json({ brand }, 201)
}
