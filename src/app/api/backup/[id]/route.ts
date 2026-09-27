import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { json, errorJson } from '@/lib/api'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await requirePermission('backups.manage')
  if ('error' in r) return r.error
  const { id } = await ctx.params
  const backup = await db.backup.findUnique({ where: { id } })
  if (!backup) return errorJson('Backup no encontrado', 404)
  return new NextResponse(backup.data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
    },
  })
}
