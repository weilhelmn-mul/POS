import type { PermissionKey, Role } from '@/types'

export const ALL_PERMISSIONS: PermissionKey[] = [
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'prices.edit', 'inventory.edit',
  'sales.create', 'sales.void', 'sales.view', 'sales.reprint',
  'customers.create', 'customers.edit', 'customers.delete', 'customers.credit', 'receivables.view',
  'reports.view',
  'expenses.create', 'purchases.create',
  'users.manage', 'settings.manage', 'backups.manage', 'audit.view',
  'bundles.manage', 'categories.manage', 'suppliers.manage',
]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'products.view': 'Ver productos',
  'products.create': 'Crear productos',
  'products.edit': 'Modificar productos',
  'products.delete': 'Eliminar productos',
  'prices.edit': 'Modificar precios',
  'inventory.edit': 'Modificar inventario',
  'sales.create': 'Hacer ventas',
  'sales.void': 'Anular ventas',
  'sales.view': 'Ver ventas anteriores',
  'sales.reprint': 'Reimprimir facturas',
  'customers.create': 'Crear clientes',
  'customers.edit': 'Editar clientes',
  'customers.delete': 'Eliminar clientes',
  'customers.credit': 'Dar crédito',
  'receivables.view': 'Ver cuentas por cobrar',
  'reports.view': 'Ver reportes',
  'expenses.create': 'Registrar gastos',
  'purchases.create': 'Registrar compras',
  'users.manage': 'Administrar usuarios',
  'settings.manage': 'Configurar sistema',
  'backups.manage': 'Copias de seguridad',
  'audit.view': 'Ver auditoría',
  'bundles.manage': 'Administrar combos',
  'categories.manage': 'Administrar categorías',
  'suppliers.manage': 'Administrar proveedores',
}

// Operaciones que requieren contraseña de autorización secundaria
export const AUTH_REQUIRED_ACTIONS: PermissionKey[] = [
  'prices.edit', 'sales.void', 'products.delete', 'inventory.edit',
  'customers.delete', 'sales.reprint',
]

export function permissionsForRole(role: Role): PermissionKey[] {
  if (role === 'admin') return [...ALL_PERMISSIONS]
  return []
}

export function hasPermission(perms: PermissionKey[], key: PermissionKey): boolean {
  return perms.includes(key)
}

export function parsePermissions(json: string | null | undefined): PermissionKey[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
