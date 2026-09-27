import {
  LayoutDashboard, ShoppingCart, Package, FolderTree, Users, Receipt,
  ClipboardList, Wallet, BarChart3, UserCog, ScrollText, DatabaseBackup,
  Download, Settings, FileWarning, type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/store/ui'
import type { PermissionKey } from '@/types'

export interface NavItem {
  key: ModuleKey
  label: string
  icon: LucideIcon
  perm?: PermissionKey
  group: 'principal' | 'comercial' | 'gestión' | 'sistema'
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: undefined, group: 'principal' },
  { key: 'pos', label: 'Punto de Venta', icon: ShoppingCart, perm: 'sales.create', group: 'principal' },
  { key: 'products', label: 'Productos', icon: Package, perm: 'products.view', group: 'comercial' },
  { key: 'categories', label: 'Categorías y Marcas', icon: FolderTree, perm: 'products.view', group: 'comercial' },
  { key: 'customers', label: 'Clientes', icon: Users, perm: 'customers.create', group: 'comercial' },
  { key: 'sales', label: 'Ventas', icon: Receipt, perm: 'sales.view', group: 'comercial' },
  { key: 'receivables', label: 'Cuentas por Cobrar', icon: FileWarning, perm: 'receivables.view', group: 'comercial' },
  { key: 'purchases', label: 'Compras', icon: ClipboardList, perm: 'purchases.create', group: 'gestión' },
  { key: 'expenses', label: 'Gastos', icon: Wallet, perm: 'expenses.create', group: 'gestión' },
  { key: 'reports', label: 'Reportes', icon: BarChart3, perm: 'reports.view', group: 'gestión' },
  { key: 'users', label: 'Usuarios', icon: UserCog, perm: 'users.manage', group: 'sistema' },
  { key: 'audit', label: 'Auditoría', icon: ScrollText, perm: 'audit.view', group: 'sistema' },
  { key: 'export', label: 'Exportar', icon: Download, perm: 'reports.view', group: 'sistema' },
  { key: 'backup', label: 'Copias de Seguridad', icon: DatabaseBackup, perm: 'backups.manage', group: 'sistema' },
  { key: 'settings', label: 'Configuración', icon: Settings, perm: 'settings.manage', group: 'sistema' },
]
