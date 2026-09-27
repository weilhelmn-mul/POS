import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let currentConfigKey = ''

/**
 * Crea o retorna el cliente de Supabase cacheado.
 */
export function getSupabase(url: string, anonKey: string): SupabaseClient {
  const configKey = `${url}|${anonKey}`
  if (client && currentConfigKey === configKey) {
    return client
  }
  if (!url || !anonKey) {
    throw new Error('URL y API key de Supabase son requeridos')
  }
  client = createClient(url, anonKey)
  currentConfigKey = configKey
  return client
}

/**
 * Prueba la conexión a Supabase consultando una tabla del sistema.
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ ok: boolean; error?: string; projectRef?: string }> {
  try {
    const supabase = getSupabase(url, anonKey)
    // Intentar una consulta simple a una tabla del sistema
    const { error } = await supabase.from('pg_tables').select('tablename').limit(1)
    if (error && !error.message.includes('does not exist')) {
      // Si el error es de permisos, la conexión funciona pero falta RLS
      return { ok: true, projectRef: url.match(/https:\/\/([^.]+)/)?.[1] }
    }
    return { ok: true, projectRef: url.match(/https:\/\/([^.]+)/)?.[1] }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Obtiene el listado de tablas disponibles en Supabase.
 */
export async function listSupabaseTables(url: string, anonKey: string): Promise<string[]> {
  const supabase = getSupabase(url, anonKey)
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  if (error) throw error
  return (data || []).map((r: { table_name: string }) => r.table_name)
}
