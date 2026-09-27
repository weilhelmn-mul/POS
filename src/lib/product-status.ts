import type { ProductStatus, ProductWithStatus } from '@/types'
import type { Product } from '@prisma/client'

// Calcula el estado visual de un producto según stock y vencimiento
export function computeProductStatus(
  stock: number,
  minStock: number,
  expiryDate: Date | null,
  alertDays: number,
): ProductStatus {
  // Vencimiento primero (prioridad alta)
  if (expiryDate) {
    const now = new Date()
    const expiry = new Date(expiryDate)
    if (expiry.getTime() < now.getTime()) return 'expired'
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= alertDays) return 'near_expiry'
  }
  if (stock <= 0) return 'out'
  if (stock <= minStock) return 'low'
  return 'available'
}

export const STATUS_META: Record<ProductStatus, { label: string; color: string; emoji: string; badgeClass: string }> = {
  available: { label: 'Disponible', color: 'green', emoji: '🟢', badgeClass: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300' },
  low: { label: 'Bajo stock', color: 'yellow', emoji: '🟡', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300' },
  out: { label: 'Sin stock', color: 'red', emoji: '🔴', badgeClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300' },
  incoming: { label: 'En camino', color: 'blue', emoji: '🔵', badgeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300' },
  near_expiry: { label: 'Próximo a vencer', color: 'orange', emoji: '🟠', badgeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300' },
  expired: { label: 'Vencido', color: 'gray', emoji: '⚫', badgeClass: 'bg-gray-200 text-gray-800 border-gray-400 dark:bg-gray-800 dark:text-gray-200' },
}

export function formatCurrency(amount: number, currency = 'S/'): string {
  return `${currency} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
