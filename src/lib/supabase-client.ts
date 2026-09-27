import type { SupabaseClient } from '@supabase/supabase-js'
let client: SupabaseClient | null = null; let currentConfigKey = ''
export async function getSupabase(url: string, anonKey: string): Promise<SupabaseClient> {
  const configKey = `${url}|${anonKey}`
  if (client && currentConfigKey === configKey) return client
  if (!url || !anonKey) throw new Error('URL y API key de Supabase son requeridos')
  const { createClient } = await import('@supabase/supabase-js')
  client = createClient(url, anonKey); currentConfigKey = configKey
  return client
}
export async function testSupabaseConnection(url: string, anonKey: string) { try { const supabase = await getSupabase(url, anonKey); const { error } = await supabase.from('pg_tables').select('tablename').limit(1); return { ok: true, projectRef: url.match(/https:\/\/([^.]+)/)?.[1] } } catch (e) { return { ok: false, error: (e as Error).message } } }
export async function listSupabaseTables(url: string, anonKey: string) { const supabase = await getSupabase(url, anonKey); const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public'); if (error) throw error; return (data || []).map((r: any) => r.table_name) }
