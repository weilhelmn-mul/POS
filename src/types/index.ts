// Tipos compartidos del sistema POS

export type Role = 'admin' | 'vendor'

export type PermissionKey =
  | 'products.view' | 'products.create' | 'products.edit' | 'products.delete'
  | 'prices.edit' | 'inventory.edit'
  | 'sales.create' | 'sales.void' | 'sales.view' | 'sales.reprint'
  | 'customers.create' | 'customers.edit' | 'customers.delete' | 'customers.credit' | 'receivables.view'
  | 'reports.view'
  | 'expenses.create' | 'purchases.create'
  | 'users.manage' | 'settings.manage' | 'backups.manage' | 'audit.view'
  | 'bundles.manage' | 'categories.manage' | 'suppliers.manage'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: Role
  permissions: PermissionKey[]
}

export type ProductStatus = 'available' | 'low' | 'out' | 'incoming' | 'near_expiry' | 'expired'

export interface ProductWithStatus {
  id: string
  name: string
  internalCode: string
  barcode: string | null
  gs1Code: string | null
  image: string | null
  stock: number
  minStock: number
  salePrice: number
  purchasePrice: number
  wholesalePrice: number
  unit: string
  expiryDate: string | null
  status: ProductStatus
  isBundle: boolean
  categoryName?: string | null
  brandName?: string | null
  supplierName?: string | null
  locationWarehouse?: string | null
  locationAisle?: string | null
  locationShelf?: string | null
  locationLevel?: string | null
  lot?: string | null
}

export interface CartItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  image?: string | null
  stock?: number
  isBundle?: boolean
}

export interface OpenSale {
  id: string
  customerId: string | null
  customerName: string
  items: CartItem[]
  discount: number
  observations: string
  paymentMethod: string
  createdAt: number
}

export type PaymentMethod = 'cash' | 'card' | 'yape' | 'plin' | 'transfer' | 'credit' | 'mixed'

export interface PaymentSplit {
  method: PaymentMethod
  amount: number
  reference?: string
}
