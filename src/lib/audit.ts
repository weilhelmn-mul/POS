import { db } from '@/lib/db'
import type { SessionUser } from '@/types'

// Registra en la bitácora de auditoría
export async function logAudit(params: {
  user?: SessionUser | null
  action: string
  entity: string
  entityId?: string | null
  oldValue?: unknown
  newValue?: unknown
  authorizedById?: string | null
  saleId?: string | null
  ip?: string | null
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.user?.id ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        authorizedById: params.authorizedById ?? null,
        saleId: params.saleId ?? null,
        ip: params.ip ?? null,
      },
    })
  } catch (e) {
    console.error('audit log failed', e)
  }
}
