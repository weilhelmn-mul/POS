import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/api'
import { createBackup } from '@/lib/backup'
import { logAudit } from '@/lib/audit'
import { json } from '@/lib/api'

export async function GET() {
  const r = await requirePermission('backups.manage')
  if ('error' in r) return r.error
  const backups = await db.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return json({ backups: backups.map((b) => ({ id: b.id, filename: b.filename, size: b.size, auto: b.auto, createdAt: b.createdAt })) })
}

export async function POST(req: NextRequest) {
  const r = await requirePermission('backups.manage')
  if ('error' in r) return r.error
  const body = await req.json().catch(() => ({}))
  const auto = !!body.auto
  const { data, json: jsonStr } = await createBackup()
  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const backup = await db.backup.create({ data: { filename, size: Buffer.byteLength(jsonStr, 'utf-8'), data: jsonStr, auto } })
  await logAudit({ user: r.user, action: 'create', entity: 'backup', entityId: backup.id, newValue: { filename } })
  return json({ backup: { id: backup.id, filename, size: backup.size, createdAt: backup.createdAt } }, 201)
}
