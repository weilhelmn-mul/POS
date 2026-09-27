import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json } from '@/lib/api'

export async function GET() {
  const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } })
  return json({ suppliers })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('suppliers.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  const supplier = await db.supplier.create({
    data: {
      name: body.name, document: body.document || null, phone: body.phone || null,
      email: body.email || null, address: body.address || null, contact: body.contact || null, notes: body.notes || null,
    },
  })
  return json({ supplier }, 201)
}
