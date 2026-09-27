import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/api'
import { exportData } from '@/lib/export'
import { errorJson } from '@/lib/api'

export async function GET(req: NextRequest) {
  const r = await requirePermission('reports.view')
  if ('error' in r) return r.error
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') || 'xlsx') as 'xlsx' | 'csv' | 'json'
  const resource = searchParams.get('resource') || 'products'
  try {
    const { buffer, filename, mime } = await exportData({ format, resource })
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return errorJson((e as Error).message, 400)
  }
}
