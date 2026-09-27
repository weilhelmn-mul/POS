import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { setSession, clearSession, getCurrentUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'
function describePrismaError(e: unknown): { message: string; hint?: string } {
  const msg = (e as Error).message || String(e)
  if (msg.includes('Query Engine') && msg.includes('could not locate')) return { message: 'No se pudo cargar el motor de base de datos (Prisma engine).', hint: 'En Windows: instala Visual C++ Redistributable 2015-2022 x64 (https://aka.ms/vs/17/release/vc_redist.x64.exe) y reinicia la app.' }
  if (msg.includes('database is locked') || msg.includes('SQLITE_BUSY')) return { message: 'La base de datos está siendo usada por otra instancia. Cierra las demás ventanas de POS Pro.' }
  if (msg.includes('no such table') || msg.includes('database disk image is malformed') || msg.includes('file is not a database')) return { message: 'La base de datos está corrupta o no se inicializó. Cierra POS Pro, borra %APPDATA%\\POS Pro\\data y vuelve a abrir la app.' }
  if (msg.includes('does not exist in the current database')) return { message: 'La base de datos es de una versión anterior. Cierra y vuelve a abrir POS Pro — la auto-migración añadirá las columnas faltantes.' }
  return { message: 'Error interno del servidor al procesar el login.', hint: process.env.NODE_ENV !== 'production' ? msg.slice(0, 300) : undefined }
}
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { username, password } = body as { username?: string; password?: string }
  if (!username || !password) return errorJson('Usuario y contraseña requeridos', 422)
  try {
    const user = await db.user.findUnique({ where: { username } })
    if (!user || !user.active) return errorJson('Credenciales inválidas', 401)
    if (!verifyPassword(password, user.passwordHash)) return errorJson('Credenciales inválidas', 401)
    await setSession(user.id)
    await logAudit({ user: { id: user.id, username: user.username, name: user.name, role: user.role as 'admin' | 'vendor', permissions: [] }, action: 'login', entity: 'auth', ip: req.headers.get('x-forwarded-for') || 'unknown' })
    return json({ ok: true })
  } catch (e) {
    const { message, hint } = describePrismaError(e)
    return NextResponse.json({ ok: false, error: message, hint, debug: process.env.NODE_ENV !== 'production' ? String((e as Error).message).slice(0, 300) : undefined }, { status: 500 })
  }
}
export async function DELETE() { await clearSession(); return json({ ok: true }) }
export async function GET() { const user = await getCurrentUser(); if (!user) return json({ user: null }); return json({ user }) }
