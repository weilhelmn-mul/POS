import { db } from '@/lib/db'
import type { PermissionKey, Role, SessionUser } from '@/types'
import { parsePermissions, permissionsForRole } from '@/lib/permissions'

const COOKIE_NAME = 'pos_session'
const SECRET = process.env.SESSION_SECRET || 'pos-secret-change-in-production-please'

// ---- Hashing (node:crypto scrypt) ----
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const hash = parts[2]
  const test = scryptSync(password, salt, 64)
  const testHash = test.toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(testHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ---- Session token (HMAC signed) ----
function sign(payload: string): string {
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf('.')
  if (idx === -1) return null
  const payload = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
  try {
    if (sig.length !== expected.length) return null
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, ts: Date.now() })
  return sign(Buffer.from(payload).toString('base64url'))
}

export function readSessionToken(token: string): { uid: string; ts: number } | null {
  const payload = verify(token)
  if (!payload) return null
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return json
  } catch {
    return null
  }
}

export const SESSION_COOKIE = COOKIE_NAME

// ---- Load user from DB and build SessionUser ----
export async function getSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) return null
  let perms: PermissionKey[] = []
  if (user.role === 'admin') {
    perms = permissionsForRole('admin')
  } else {
    perms = parsePermissions(user.permissions)
  }
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
    permissions: perms,
  }
}
