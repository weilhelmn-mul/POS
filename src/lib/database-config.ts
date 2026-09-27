// Configuración de base de datos del POS

export type DatabaseProvider = 'local' | 'supabase' | 'firebase'

export interface DatabaseConfig {
  provider: DatabaseProvider
  // Supabase
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceKey?: string
  // Firebase (Firestore)
  firebaseConfig?: {
    apiKey?: string
    authDomain?: string
    projectId?: string
    storageBucket?: string
    messagingSenderId?: string
    appId?: string
  }
  // Estado de sincronización
  lastSyncAt?: string | null
  autoSync?: boolean
  syncCollections?: string[] // qué entidades sincronizar
}

export const DEFAULT_DB_CONFIG: DatabaseConfig = {
  provider: 'local',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceKey: '',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  lastSyncAt: null,
  autoSync: false,
  syncCollections: ['products', 'customers', 'sales', 'categories', 'suppliers'],
}

// Colecciones/tablas que se pueden sincronizar
export const SYNC_COLLECTIONS = [
  { key: 'products', label: 'Productos', icon: '📦' },
  { key: 'customers', label: 'Clientes', icon: '👤' },
  { key: 'sales', label: 'Ventas', icon: '🧾' },
  { key: 'categories', label: 'Categorías', icon: '🗂️' },
  { key: 'suppliers', label: 'Proveedores', icon: '🚚' },
  { key: 'brands', label: 'Marcas', icon: '🏷️' },
  { key: 'expenses', label: 'Gastos', icon: '💸' },
  { key: 'purchases', label: 'Compras', icon: '📋' },
] as const
