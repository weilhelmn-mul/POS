import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { restoreBackup } from '@/lib/backup'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'

export async function POST(req: NextRequest) {
  const r = await requirePermission('backups.manage')
  if ('error' in r) return r.error
  const body = await req.json()
  const { json: jsonStr, replaceUsers } = body as { json: string; replaceUsers?: boolean }
  if (!jsonStr) return errorJson('Datos de backup requeridos', 422)
  const result = await restoreBackup(jsonStr, { replaceUsers })
  if (!result.ok) return errorJson(result.error || 'Error al restaurar', 400)
  await logAudit({ user: r.user, action: 'restore', entity: 'backup', newValue: result.counts })
  return json({ ok: true, counts: result.counts })
}
