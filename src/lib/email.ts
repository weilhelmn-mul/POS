import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
let cachedTransport: Transporter | null = null
let cachedMode: 'smtp' | 'console' = 'console'
function getTransport(): { transport: Transporter; mode: 'smtp' | 'console' } {
  if (cachedTransport) return { transport: cachedTransport, mode: cachedMode }
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  if (host && user && pass) {
    cachedTransport = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, tls: { rejectUnauthorized: false } })
    cachedMode = 'smtp'
  } else {
    cachedTransport = nodemailer.createTransport({ jsonTransport: true } as any)
    cachedMode = 'console'
  }
  return { transport: cachedTransport, mode: cachedMode }
}
export interface SendMailParams { to: string; subject: string; text: string; html?: string }
export async function sendMail({ to, subject, text, html }: SendMailParams): Promise<{ mode: 'smtp' | 'console'; previewUrl?: string }> {
  const from = process.env.SMTP_FROM || 'POS Pro <no-reply@pospro.local>'
  const { transport, mode } = getTransport()
  const info = await transport.sendMail({ from, to, subject, text, html })
  if (mode === 'console') {
    const preview = typeof info.message === 'string' ? info.message : JSON.stringify(info.message, null, 2)
    if (preview) {
      const urlMatch = preview.match(/(https?:\/\/[^\s"<]+reset-password\?token=[^\s"<]+)/)
      console.log('\n┌─── CORREO DE PRUEBA (SMTP no configurado) ──────────────────')
      console.log(`│ Para:     ${to}`); console.log(`│ Asunto:   ${subject}`); console.log(`│ HTML body: ${preview.length} bytes`)
      if (urlMatch) console.log(`│ Enlace:   ${urlMatch[1]}`)
      console.log('└─────────────────────────────────────────────────────────────\n')
    }
    return { mode, previewUrl: preview }
  }
  return { mode }
}
export function isSmtpConfigured(): boolean { return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) }
export function buildAppUrl(req?: { headers: Headers }): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (req) { const proto = req.headers.get('x-forwarded-proto') || 'http'; const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'; return `${proto}://${host}` }
  return 'http://localhost:3000'
}
export function generateResetToken(): string { const { randomBytes } = require('crypto'); return randomBytes(32).toString('hex') }
