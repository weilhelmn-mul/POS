import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { db } from '@/lib/db'
import { DEFAULT_DB_CONFIG, type DatabaseConfig } from '@/lib/database-config'
import { json, errorJson } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const KEY = 'database_config'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)
  const row = await db.setting.findUnique({ where: { key: KEY } })
  const config: DatabaseConfig = row ? { ...DEFAULT_DB_CONFIG, ...JSON.parse(row.value) } : DEFAULT_DB_CONFIG
  // No devolver claves sensibles completas
  return json({
    config: {
      ...config,
      supabaseAnonKey: config.supabaseAnonKey ? '••••••••' + config.supabaseAnonKey.slice(-6) : '',
      supabaseServiceKey: config.supabaseServiceKey ? '••••••••' + config.supabaseServiceKey.slice(-6) : '',
    },
    hasCredentials: {
      supabase: !!(config.supabaseUrl && config.supabaseAnonKey),
      firebase: !!(config.firebaseConfig?.apiKey && config.firebaseConfig?.projectId),
    },
  })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorJson('No autenticado', 401)
  const body = await req.json() as DatabaseConfig

  // Si las claves vienen enmascaradas (••••), conservar las existentes
  const existing = await db.setting.findUnique({ where: { key: KEY } })
  const existingConfig: DatabaseConfig | null = existing ? JSON.parse(existing.value) : null

  const finalConfig: DatabaseConfig = {
    ...DEFAULT_DB_CONFIG,
    ...body,
    supabaseAnonKey: body.supabaseAnonKey?.startsWith('••••') ? (existingConfig?.supabaseAnonKey || '') : (body.supabaseAnonKey || ''),
    supabaseServiceKey: body.supabaseServiceKey?.startsWith('••••') ? (existingConfig?.supabaseServiceKey || '') : (body.supabaseServiceKey || ''),
  }

  await db.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(finalConfig) },
    create: { key: KEY, value: JSON.stringify(finalConfig) },
  })

  await logAudit({ user, action: 'update', entity: 'setting', entityId: KEY, newValue: { provider: finalConfig.provider } })
  return json({ ok: true, config: { ...finalConfig, supabaseAnonKey: '••••', supabaseServiceKey: '••••' } })
}
