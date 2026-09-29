'use client'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/hooks'
import { useUI } from '@/store/ui'
import { Store, Palette, Save, Upload, Database, Cloud, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, XCircle, Loader2, Wifi, WifiOff, Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessSettings } from '@/lib/settings'
import type { DatabaseConfig, DatabaseProvider } from '@/lib/database-config'
import { SYNC_COLLECTIONS, SYNC_INTERVAL_OPTIONS, DEFAULT_DB_CONFIG } from '@/lib/database-config'

const THEMES = [
  { value: 'light', label: 'Claro', color: 'bg-white border' },
  { value: 'dark', label: 'Oscuro', color: 'bg-gray-900' },
  { value: 'blue', label: 'Azul', color: 'bg-blue-600' },
  { value: 'green', label: 'Verde', color: 'bg-emerald-600' },
  { value: 'pro', label: 'Profesional', color: 'bg-stone-700' },
] as const

export default function Settings() {
  const qc = useQueryClient()
  const { theme, setTheme } = useUI()
  const [form, setForm] = useState<BusinessSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ business: BusinessSettings }>('/api/settings').then((d) => setForm(d.business))
  }, [])

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(form) })
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['business'] })
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) setForm((f) => f ? { ...f, logo: d.url } : f)
  }

  if (!form) return <div className="p-4 text-muted-foreground">Cargando...</div>

  return (
    <div className="p-4 max-w-4xl">
      <Tabs defaultValue="business">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="business"><Store className="w-4 h-4 mr-1" />Negocio</TabsTrigger>
          <TabsTrigger value="database"><Database className="w-4 h-4 mr-1" />Base de Datos</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-1" />Apariencia</TabsTrigger>
        </TabsList>

        {/* === PESTAÑA: DATOS DEL NEGOCIO === */}
        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Store className="w-5 h-5" />Datos del negocio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2"><Label>Nombre del negocio</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>RUC</Label><Input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Moneda</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="S/" /></div>
                <div className="space-y-1.5"><Label>IGV (%)</Label><Input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Alerta vencimiento (días)</Label><Input type="number" value={form.expiryAlertDays} onChange={(e) => setForm({ ...form, expiryAlertDays: +e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Mensaje final del ticket</Label><Textarea value={form.ticketFooter} onChange={(e) => setForm({ ...form, ticketFooter: e.target.value })} rows={2} /></div>
              <div className="space-y-1.5">
                <Label>Logo del negocio</Label>
                <div className="flex items-center gap-3">
                  {form.logo && <img src={form.logo} alt="" className="h-16 rounded border object-contain" />}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-accent"><Upload className="w-4 h-4" />Subir logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Formato de impresión por defecto</Label>
                <Select value={form.printFormat} onValueChange={(v) => setForm({ ...form, printFormat: v as '80mm' | 'a4' })}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="80mm">Ticket térmico 80mm</SelectItem><SelectItem value="a4">Factura A4</SelectItem></SelectContent></Select>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/40 dark:bg-amber-950/20">
                <div>
                  <Label className="cursor-pointer">Permitir stock negativo</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Permite vender más allá del stock disponible</p>
                </div>
                <Switch checked={form.allowNegativeStock} onCheckedChange={(v) => setForm({ ...form, allowNegativeStock: v })} />
              </div>
              <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PESTAÑA: BASE DE DATOS === */}
        <TabsContent value="database">
          <DatabaseConfigPanel />
        </TabsContent>

        {/* === PESTAÑA: APARIENCIA === */}
        <TabsContent value="theme">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="w-5 h-5" />Tema visual</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {THEMES.map((t) => (
                  <button key={t.value} onClick={() => setTheme(t.value)} className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${theme === t.value ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-accent'}`}>
                    <div className={`w-8 h-8 rounded-full ${t.color} border`} />
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">El tema se aplica inmediatamente y se guarda en este dispositivo.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============ PANEL DE CONFIGURACIÓN DE BASE DE DATOS ============
function DatabaseConfigPanel() {
  const [config, setConfig] = useState<DatabaseConfig>(DEFAULT_DB_CONFIG)
  const [hasCreds, setHasCreds] = useState({ supabase: false, firebase: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<'supabase' | 'firebase' | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; error?: string } | null>>({})
  const [syncing, setSyncing] = useState<'upload' | 'download' | 'both' | 'auto' | null>(null)
  const [syncResult, setSyncResult] = useState<{ uploaded: number; downloaded: number; errors: string[] } | null>(null)
  const [nextSyncInSec, setNextSyncInSec] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<{ config: DatabaseConfig; hasCredentials: { supabase: boolean; firebase: boolean } }>('/api/config/database').then((d) => {
      setConfig(d.config)
      setHasCreds(d.hasCredentials)
      setLoading(false)
    })
  }, [])

  // Auto-sync: arrancar intervalo cuando autoSync está activo y el provider no es local
  useEffect(() => {
    if (!config.autoSync || config.provider === 'local' || !config.syncCollections?.length) {
      setNextSyncInSec(null)
      return
    }
    const minutes = config.syncIntervalMin || 5
    const totalSec = Math.max(60, minutes * 60)
    let remaining = totalSec
    setNextSyncInSec(remaining)

    const ticker = setInterval(() => {
      remaining -= 1
      if (remaining < 0) remaining = totalSec
      setNextSyncInSec(remaining)
    }, 1000)

    const fireSync = () => {
      setSyncing((cur) => cur ? cur : 'auto')
    }
    const syncInterval = setInterval(fireSync, totalSec * 1000)

    return () => {
      clearInterval(ticker)
      clearInterval(syncInterval)
      setNextSyncInSec(null)
    }
  }, [config.autoSync, config.syncIntervalMin, config.provider, config.syncCollections?.length])

  // Ejecutor real de auto-sync
  useEffect(() => {
    if (syncing !== 'auto') return
    let cancelled = false
    ;(async () => {
      setSyncResult(null)
      try {
        const res = await apiFetch<{ ok: boolean; uploaded: number; downloaded: number; errors: string[]; perCollection?: Record<string, { uploaded: number; downloaded: number }> }>(`/api/config/sync`, {
          method: 'POST',
          body: JSON.stringify({ direction: 'upload' }),
        })
        if (cancelled) return
        setSyncResult({ uploaded: res.uploaded, downloaded: res.downloaded, errors: res.errors })
        if (res.ok) {
          if (res.uploaded > 0) toast.success(`Auto-sync: ${res.uploaded} registros subidos`)
        } else {
          toast.error(`Auto-sync falló: ${res.errors.length} error(es)`)
        }
        try {
          const d = await apiFetch<{ config: DatabaseConfig }>('/api/config/database')
          if (!cancelled) setConfig(d.config)
        } catch {}
      } catch (e) {
        if (!cancelled) toast.error(`Auto-sync error: ${(e as Error).message}`)
      } finally {
        if (!cancelled) setSyncing(null)
      }
    })()
    return () => { cancelled = true }
  }, [syncing])

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/config/database', { method: 'PUT', body: JSON.stringify(config) })
      toast.success('Configuración de base de datos guardada')
      const d = await apiFetch<{ hasCredentials: { supabase: boolean; firebase: boolean } }>('/api/config/database')
      setHasCreds(d.hasCredentials)
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  const testConnection = async (provider: 'supabase' | 'firebase') => {
    setTesting(provider)
    setTestResult((r) => ({ ...r, [provider]: null }))
    try {
      const res = await apiFetch<{ ok: boolean; error?: string; projectId?: string }>(`/api/config/test`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      })
      setTestResult((r) => ({ ...r, [provider]: res }))
      if (res.ok) toast.success(`Conexión a ${provider === 'supabase' ? 'Supabase' : 'Firebase'} exitosa`)
      else toast.error(`Error: ${res.error}`)
    } catch (e) {
      setTestResult((r) => ({ ...r, [provider]: { ok: false, error: (e as Error).message } }))
      toast.error((e as Error).message)
    } finally { setTesting(null) }
  }

  const doSync = async (direction: 'upload' | 'download' | 'both') => {
    setSyncing(direction)
    setSyncResult(null)
    try {
      const res = await apiFetch<{ ok: boolean; uploaded: number; downloaded: number; errors: string[]; perCollection?: Record<string, { uploaded: number; downloaded: number }> }>(`/api/config/sync`, {
        method: 'POST',
        body: JSON.stringify({ direction }),
      })
      setSyncResult({ uploaded: res.uploaded, downloaded: res.downloaded, errors: res.errors })
      if (res.ok) toast.success(`Sincronización completa: ${res.uploaded} subidos, ${res.downloaded} descargados`)
      else toast.error(`Sincronización con ${res.errors.length} errores`)
      // Recargar config para actualizar lastSyncAt
      const d = await apiFetch<{ config: DatabaseConfig }>('/api/config/database')
      setConfig(d.config)
    } catch (e) {
      toast.error((e as Error).message)
    } finally { setSyncing(null) }
  }

  const toggleCollection = (key: string) => {
    setConfig((c) => ({
      ...c,
      syncCollections: c.syncCollections?.includes(key)
        ? c.syncCollections.filter((k) => k !== key)
        : [...(c.syncCollections || []), key],
    }))
  }

  if (loading) return <div className="p-4 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando configuración...</div>

  return (
    <div className="space-y-4">
      {/* Selector de proveedor */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="w-5 h-5" />Proveedor de base de datos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ProviderCard
              active={config.provider === 'local'}
              onClick={() => setConfig({ ...config, provider: 'local' })}
              icon={<WifiOff className="w-5 h-5" />}
              title="Local (SQLite)"
              desc="Funciona offline. Datos guardados en este dispositivo."
              badge="Predeterminado"
              color="emerald"
            />
            <ProviderCard
              active={config.provider === 'supabase'}
              onClick={() => setConfig({ ...config, provider: 'supabase' })}
              icon={<Cloud className="w-5 h-5" />}
              title="Supabase"
              desc="PostgreSQL en la nube. Sincroniza entre dispositivos."
              connected={hasCreds.supabase}
              color="green"
            />
            <ProviderCard
              active={config.provider === 'firebase'}
              onClick={() => setConfig({ ...config, provider: 'firebase' })}
              icon={<Cloud className="w-5 h-5" />}
              title="Firebase Firestore"
              desc="NoSQL en tiempo real. Sincronización instantánea."
              connected={hasCreds.firebase}
              color="amber"
            />
          </div>

          {/* Estado de sincronización */}
          {config.lastSyncAt && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Última sincronización:</span>
              <span className="font-medium">{new Date(config.lastSyncAt).toLocaleString('es-PE')}</span>
            </div>
          )}

          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </CardContent>
      </Card>

      {/* Configuración de Supabase */}
      {config.provider === 'supabase' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="w-5 h-5 text-emerald-600" />Configuración de Supabase
              {testResult.supabase && (
                <Badge variant={testResult.supabase.ok ? 'default' : 'destructive'} className="ml-auto">
                  {testResult.supabase.ok ? <><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</> : <><XCircle className="w-3 h-3 mr-1" />Error</>}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL del proyecto</Label>
              <Input value={config.supabaseUrl} onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })} placeholder="https://xxxxx.supabase.co" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key (anon public)</Label>
              <Input type="password" value={config.supabaseAnonKey} onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." />
            </div>
            <div className="space-y-1.5">
              <Label>Service Role Key (opcional, para operaciones admin)</Label>
              <Input type="password" value={config.supabaseServiceKey} onChange={(e) => setConfig({ ...config, supabaseServiceKey: e.target.value })} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." />
            </div>
            {testResult.supabase?.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <XCircle className="w-4 h-4 inline mr-1" />{testResult.supabase.error}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => testConnection('supabase')} disabled={testing === 'supabase' || !config.supabaseUrl}>
                {testing === 'supabase' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wifi className="w-4 h-4 mr-1" />}
                Probar conexión
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Obtén tus credenciales en <span className="font-mono">supabase.com → Settings → API</span>.
              Las tablas deben coincidir con el esquema de Prisma.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configuración de Firebase */}
      {config.provider === 'firebase' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="w-5 h-5 text-amber-600" />Configuración de Firebase
              {testResult.firebase && (
                <Badge variant={testResult.firebase.ok ? 'default' : 'destructive'} className="ml-auto">
                  {testResult.firebase.ok ? <><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</> : <><XCircle className="w-3 h-3 mr-1" />Error</>}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>API Key</Label><Input value={config.firebaseConfig?.apiKey} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, apiKey: e.target.value } })} placeholder="AIzaSy..." /></div>
              <div className="space-y-1.5"><Label>Auth Domain</Label><Input value={config.firebaseConfig?.authDomain} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, authDomain: e.target.value } })} placeholder="proyecto.firebaseapp.com" /></div>
              <div className="space-y-1.5"><Label>Project ID</Label><Input value={config.firebaseConfig?.projectId} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, projectId: e.target.value } })} placeholder="mi-proyecto-12345" /></div>
              <div className="space-y-1.5"><Label>Storage Bucket</Label><Input value={config.firebaseConfig?.storageBucket} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, storageBucket: e.target.value } })} placeholder="proyecto.appspot.com" /></div>
              <div className="space-y-1.5"><Label>Messaging Sender ID</Label><Input value={config.firebaseConfig?.messagingSenderId} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, messagingSenderId: e.target.value } })} placeholder="123456789012" /></div>
              <div className="space-y-1.5"><Label>App ID</Label><Input value={config.firebaseConfig?.appId} onChange={(e) => setConfig({ ...config, firebaseConfig: { ...config.firebaseConfig, appId: e.target.value } })} placeholder="1:123456789012:web:abc123" /></div>
            </div>
            {testResult.firebase?.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <XCircle className="w-4 h-4 inline mr-1" />{testResult.firebase.error}
              </div>
            )}
            <Button variant="outline" onClick={() => testConnection('firebase')} disabled={testing === 'firebase' || !config.firebaseConfig?.apiKey}>
              {testing === 'firebase' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wifi className="w-4 h-4 mr-1" />}
              Probar conexión
            </Button>
            <p className="text-xs text-muted-foreground">
              💡 Obtén tu configuración en <span className="font-mono">Firebase Console → Settings → General → Web apps</span>.
              Los datos se almacenarán en colecciones Firestore con el mismo nombre que las tablas locales.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sincronización (solo si no es local) */}
      {config.provider !== 'local' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="w-5 h-5" />Sincronización de datos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Colecciones a sincronizar */}
            <div className="space-y-2">
              <Label>Datos a sincronizar</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SYNC_COLLECTIONS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent text-sm">
                    <input
                      type="checkbox"
                      checked={config.syncCollections?.includes(c.key) || false}
                      onChange={() => toggleCollection(c.key)}
                      className="w-4 h-4"
                    />
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sincronización automática */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="cursor-pointer">Sincronización automática</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Subir cambios automáticamente cada {config.syncIntervalMin || 5} minutos
                  </p>
                </div>
                <Switch
                  checked={config.autoSync || false}
                  onCheckedChange={(v) => setConfig({ ...config, autoSync: v })}
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t">
                <Label className="text-xs shrink-0">Frecuencia</Label>
                <Select
                  value={String(config.syncIntervalMin || 5)}
                  onValueChange={(v) => setConfig({ ...config, syncIntervalMin: parseInt(v, 10) })}
                  disabled={!config.autoSync}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.autoSync && nextSyncInSec !== null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  {syncing === 'auto' ? (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sincronizando...
                    </span>
                  ) : (
                    <span>
                      Próxima subida en <strong className="text-foreground">{Math.floor(nextSyncInSec / 60)}:{String(nextSyncInSec % 60).padStart(2, '0')}</strong> min
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Botones de sincronización */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={() => doSync('upload')} disabled={!!syncing} variant="outline">
                {syncing === 'upload' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-1" />}
                Subir a la nube
              </Button>
              <Button onClick={() => doSync('download')} disabled={!!syncing} variant="outline">
                {syncing === 'download' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-1" />}
                Descargar de la nube
              </Button>
              <Button onClick={() => doSync('both')} disabled={!!syncing}>
                {syncing === 'both' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Sincronizar todo
              </Button>
            </div>

            {/* Resultado de sincronización */}
            {syncResult && (
              <div className={`p-4 rounded-lg border ${syncResult.errors.length ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {syncResult.errors.length ? <XCircle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  <span className="font-medium">{syncResult.errors.length ? 'Sincronización con errores' : 'Sincronización completa'}</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>📤 Subidos: <strong>{syncResult.uploaded}</strong> registros</p>
                  <p>📥 Descargados: <strong>{syncResult.downloaded}</strong> registros</p>
                  {syncResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-amber-600 text-xs">Ver {syncResult.errors.length} errores</summary>
                      <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {syncResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )}

            <Button onClick={save} disabled={saving} variant="outline" className="w-full">
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración de sync'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info adicional para local */}
      {config.provider === 'local' && (
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Modo local activo</p>
              <p className="text-muted-foreground">Los datos se guardan en este dispositivo (SQLite). Funciona sin conexión a internet. Para sincronizar entre dispositivos, cambia a Supabase o Firebase.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProviderCard({ active, onClick, icon, title, desc, badge, connected, color }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
  badge?: string
  connected?: boolean
  color: 'emerald' | 'green' | 'amber'
}) {
  const colors = {
    emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
    green: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
    amber: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
  }
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 border-2 rounded-lg transition-all ${active ? colors[color] : 'hover:bg-accent border-border'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-white dark:bg-black/30' : 'bg-muted'}`}>
          {icon}
        </div>
        {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        {connected && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" />Conectado</Badge>}
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </button>
  )
}
