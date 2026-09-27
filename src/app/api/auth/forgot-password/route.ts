import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createResetToken } from '@/lib/auth'
import { sendMail, buildAppUrl } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { json, errorJson } from '@/lib/api'
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = (body?.email as string | undefined)?.trim().toLowerCase()
  if (!email || !email.includes('@')) return errorJson('Correo electrónico inválido', 422)
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.active) return json({ ok: true, message: 'Si el correo está registrado, recibirás un enlace.' })
  const token = createResetToken(user.id)
  const expiry = new Date(Date.now() + 60 * 60 * 1000)
  await db.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: expiry } })
  const appUrl = buildAppUrl(req)
  const resetLink = `${appUrl}/reset-password?token=${token}`
  const mailResult = await sendMail({ to: user.email!, subject: 'POS Pro — Restablece tu contraseña', text: `Hola ${user.name},\n\nSolicitaste restablecer tu contraseña.\n\nUsa este enlace (válido 1 hora):\n${resetLink}\n\nSi no solicitaste este cambio, ignora este correo.`, html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;"><h2 style="color:#4f46e5;">POS Pro — Restablece tu contraseña</h2><p>Hola <strong>${user.name}</strong>,</p><p>Solicitaste restablecer tu contraseña. Haz clic en el botón:</p><p style="text-align:center;margin:24px 0;"><a href="${resetLink}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Restablecer contraseña</a></p><p style="color:#6b7280;font-size:13px;">O pega este enlace:</p><p style="background:#f3f4f6;padding:10px;border-radius:4px;word-break:break-all;font-family:monospace;font-size:12px;">${resetLink}</p><p style="color:#6b7280;font-size:13px;">Expira en 1 hora.</p></div>` }).catch(() => ({ mode: 'error' as const }))
  await logAudit({ user: { id: user.id, username: user.username, name: user.name, role: user.role as any, permissions: [] }, action: 'password.reset.request', entity: 'auth', ip: req.headers.get('x-forwarded-for') || 'unknown' } as any).catch(() => {})
  if (mailResult.mode === 'console') return json({ ok: true, message: 'Si el correo está registrado, recibirás un enlace.', devResetUrl: resetLink, smtpConfigured: false })
  return json({ ok: true, message: 'Si el correo está registrado, recibirás un enlace.', smtpConfigured: true })
}
