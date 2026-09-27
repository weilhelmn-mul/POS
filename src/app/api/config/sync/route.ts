import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { DEFAULT_DB_CONFIG, type DatabaseConfig } from '@/lib/database-config'
import { syncToCloud } from '@/lib/sync-service'
import { json, errorJson } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const KEY = 'database_config'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)

  const body = await req.json() as { direction: 'upload' | 'download' | 'both' }
  const direction = body.direction || 'both'

  const row = await db.setting.findUnique({ where: { key: KEY } })
  const config: DatabaseConfig = row ? { ...DEFAULT_DB_CONFIG, ...JSON.parse(row.value) } : DEFAULT_DB_CONFIG

  if (config.provider === 'local') {
    return errorJson('El proveedor es "local". Cambia a Supabase o Firebase en la configuración para sincronizar.', 422)
  }

  const result = await syncToCloud(config, direction)

  // Actualizar lastSyncAt si fue exitoso
  if (result.ok) {
    const updated = { ...config, lastSyncAt: new Date().toISOString() }
    await db.setting.upsert({
      where: { key: KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: KEY, value: JSON.stringify(updated) },
    })
  }

  await logAudit({ user, action: 'sync', entity: 'database', newValue: { direction, ...result } })
  return json(result)
}
