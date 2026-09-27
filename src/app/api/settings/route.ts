import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/api'
import { getBusiness, setBusiness } from '@/lib/settings'
import { json } from '@/lib/api'

export async function GET() {
  const business = await getBusiness()
  return json({ business })
}

export async function PUT(req: NextRequest) {
  const r = await requirePermission('settings.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  const next = await setBusiness(body)
  return json({ business: next })
}
