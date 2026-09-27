import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { ALL_PERMISSIONS } from '@/lib/permissions'

// Helpers de configuración del negocio (tabla Setting)
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } })
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value)
  await db.setting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  })
}

export interface BusinessSettings {
  name: string
  logo: string
  address: string
  phone: string
  email: string
  ruc: string
  ticketFooter: string
  taxRate: number // %
  currency: string // S/, $, etc
  expiryAlertDays: number
  printFormat: '80mm' | 'a4'
}

export const DEFAULT_BUSINESS: BusinessSettings = {
  name: 'Mi Negocio',
  logo: '',
  address: 'Av. Principal 123',
  phone: '999 888 777',
  email: 'ventas@minegocio.com',
  ruc: '10000000000',
  ticketFooter: '¡Gracias por su compra!',
  taxRate: 0,
  currency: 'S/',
  expiryAlertDays: 15,
  printFormat: '80mm',
}

export async function getBusiness(): Promise<BusinessSettings> {
  return getSetting<BusinessSettings>('business', DEFAULT_BUSINESS)
}

export async function setBusiness(b: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const current = await getBusiness()
  const next = { ...current, ...b }
  await setSetting('business', next)
  return next
}

export { ALL_PERMISSIONS }

// Generador de código de barras EAN-13 válido (con dígito verificador)
export function generateEan13(prefix = '20'): string {
  const body = prefix + Math.floor(Math.random() * 1000000000).toString().padStart(10, '0').slice(0, 11)
  // calcular dígito de control
  const digits = body.slice(0, 12).split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return body.slice(0, 12) + check
}

// Generar código interno auto
export function generateInternalCode(seq: number): string {
  return 'P' + String(seq).padStart(6, '0')
}

// Generar número de factura
export async function nextInvoiceNumber(): Promise<string> {
  const count = await db.sale.count()
  const year = new Date().getFullYear()
  return `F${year}-${String(count + 1).padStart(7, '0')}`
}
