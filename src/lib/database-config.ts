// Configuración de base de datos del POS

export type DatabaseProvider = 'local' | 'supabase' | 'firebase'

export interface DatabaseConfig {
  provider: DatabaseProvider
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceKey?: string
  firebaseConfig?: {
    apiKey?: string
    authDomain?: string
    projectId?: string
    storageBucket?: string
    messagingSenderId?: string
    appId?: string
  }
  firebaseAuthEmail?: string
  firebaseAuthPassword?: string
  lastSyncAt?: string | null
  autoSync?: boolean
  syncIntervalMin?: number
  syncCollections?: string[]
}

export const DEFAULT_DB_CONFIG: DatabaseConfig = {
  provider: 'firebase',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceKey: '',
  firebaseConfig: {
    apiKey: 'AIzaSyC5BC0J06Rf7kHrGldg6WZwz8TFkjgcX8Y',
    authDomain: 'pos-creard.firebaseapp.com',
    projectId: 'pos-creard',
    storageBucket: 'pos-creard.firebasestorage.app',
    messagingSenderId: '100979470409',
    appId: '1:100979470409:web:cd3437c7621d898d72cf98',
  },
  firebaseAuthEmail: 'admin@pos-creard.com',
  firebaseAuthPassword: 'admin123',
  lastSyncAt: null,
  autoSync: true,
  syncIntervalMin: 5,
  syncCollections: ['products', 'customers', 'sales', 'categories', 'suppliers'],
}

export const SYNC_INTERVAL_OPTIONS = [
  { value: 1, label: 'Cada 1 minuto', hint: 'Tiempo real (uso intensivo)' },
  { value: 5, label: 'Cada 5 minutos', hint: 'Recomendado para retail' },
  { value: 10, label: 'Cada 10 minutos', hint: 'Poco volumen de ventas' },
  { value: 15, label: 'Cada 15 minutos', hint: 'Sync periódica ligera' },
  { value: 30, label: 'Cada 30 minutos', hint: 'Baja actividad' },
  { value: 60, label: 'Cada hora', hint: 'Backup silencioso' },
] as const

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
