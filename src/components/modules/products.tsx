'use client'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Barcode } from '@/components/barcode'
import { AuthDialog } from '@/components/pos/auth-dialog'
import { Confirm } from '@/components/pos/confirm'
import { useAuth } from '@/store/auth'
import { apiFetch, useBusiness } from '@/lib/hooks'
import { STATUS_META, formatCurrency, formatDate } from '@/lib/product-status'
import type { ProductWithStatus } from '@/types'
import { Plus, Search, Pencil, Trash2, Printer, Upload, RefreshCw, QrCode, Package } from 'lucide-react'
import { toast } from 'sonner'
import { triggerGlobalSync } from '@/hooks/use-global-sync'

interface Cat { id: string; name: string; children?: Cat[] }
interface Brand { id: string; name: string }
interface Supplier { id: string; name: string }

export default function Products() {
  const has = useAuth((s) => s.has)
  const qc = useQueryClient()
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [editing, setEditing] = useState<ProductWithStatus | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductWithStatus | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [printProduct, setPrintProduct] = useState<ProductWithStatus | null>(null)

  const { data: products } = useQuery<{ products: ProductWithStatus[] }>({
    queryKey: ['products', q, status, categoryId],
    queryFn: async () => {
      const p = new URLSearchParams({ q })
      if (status !== 'all') p.set('status', status)
      if (categoryId !== 'all') p.set('categoryId', categoryId)
      return apiFetch(`/api/products?${p}`)
    },
  })
  const { data: cats } = useQuery<{ categories: Cat[] }>({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories') })
  const { data: brandsData } = useQuery<{ brands: Brand[] }>({ queryKey: ['brands'], queryFn: () => apiFetch('/api/brands') })
  const { data: supData } = useQuery<{ suppliers: Supplier[] }>({ queryKey: ['suppliers'], queryFn: () => apiFetch('/api/suppliers') })

  const list = products?.products || []

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, código o código de barras..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.emoji} {m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(cats?.categories || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {has('products.create') && (
          <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
        )}
      </div>

      {list.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          No se encontraron productos. {has('products.create') && 'Crea el primero.'}
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {list.map((p) => {
            const meta = STATUS_META[p.status]
            return (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-muted/40 flex items-center justify-center relative">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-12 h-12 text-muted-foreground/40" />}
                  <Badge variant="outline" className={`absolute top-2 left-2 ${meta.badgeClass}`}>{meta.emoji} {meta.label}</Badge>
                  {p.isBundle && <Badge className="absolute top-2 right-2">COMBO</Badge>}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.internalCode} · {p.unit}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{formatCurrency(p.salePrice, currency)}</span>
                    <span className="text-xs text-muted-foreground">Stock: <span className={`font-semibold ${p.stock <= 0 ? 'text-red-500' : p.stock <= p.minStock ? 'text-yellow-500' : ''}`}>{p.stock}</span></span>
                  </div>
                  {p.expiryDate && <p className="text-[11px] text-muted-foreground">Vence: {formatDate(p.expiryDate)} {p.lot && `· Lote ${p.lot}`}</p>}
                  {(p.locationWarehouse || p.locationShelf) && (
                    <p className="text-[11px] text-muted-foreground truncate">📍 {[p.locationWarehouse, p.locationAisle, p.locationShelf, p.locationLevel].filter(Boolean).join(' / ')}</p>
                  )}
                  <div className="flex gap-1 pt-1">
                    {has('products.edit') && <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5 mr-1" />Editar</Button>}
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPrintProduct(p)} title="Ver código de barras"><QrCode className="w-3.5 h-3.5" /></Button>
                    {has('products.delete') && <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <ProductForm
          product={editing}
          categories={cats?.categories || []}
          brands={brandsData?.brands || []}
          suppliers={supData?.suppliers || []}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['products'] }); setCreating(false); setEditing(null) }}
        />
      )}

      {/* Delete con autorización */}
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthorized={() => { /* proceed */ }} title="Eliminar producto" description="Se requiere autorización de administrador para eliminar productos." />
      <Confirm
        open={!!deleteTarget}
        title="Eliminar producto"
        description={`¿Eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await apiFetch(`/api/products/${deleteTarget!.id}`, { method: 'DELETE' })
            toast.success('Producto eliminado')
            qc.invalidateQueries({ queryKey: ['products'] })
            setDeleteTarget(null)
            // 🔥 Sincronizar inmediatamente a Firebase para que el cambio
            // (soft-delete o hard-delete) se refleje en POS CREARD Web
            triggerGlobalSync()
          } catch (e) { toast.error((e as Error).message) }
        }}
      />

      {/* Print barcode */}
      <Dialog open={!!printProduct} onOpenChange={(o) => !o && setPrintProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Código de barras · {printProduct?.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 p-4">
            {printProduct?.barcode && <div className="bg-white p-2 rounded"><Barcode value={printProduct.barcode} height={70} /></div>}
            <p className="text-sm font-medium">{printProduct?.internalCode}</p>
            {printProduct?.gs1Code && <p className="text-xs text-muted-foreground">GS1: {printProduct.gs1Code}</p>}
          </div>
          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setPrintProduct(null)}>Cerrar</Button>
            <Button onClick={() => { const el = document.getElementById('print-barcode'); if (el) { el.classList.add('printable'); window.print(); el.classList.remove('printable') } }}><Printer className="w-4 h-4 mr-1" />Imprimir</Button>
          </DialogFooter>
          <div id="print-barcode" className="hidden">
            {printProduct?.barcode && <Barcode value={printProduct.barcode} height={50} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductForm({ product, categories, brands, suppliers, onClose, onSaved }: {
  product: ProductWithStatus | null
  categories: Cat[]; brands: Brand[]; suppliers: Supplier[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!product
  const { business } = useBusiness()
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState({
    name: product?.name || '',
    internalCode: product?.internalCode || '',
    barcode: product?.barcode || '',
    gs1Code: product?.gs1Code || '',
    image: product?.image || '',
    categoryId: product?.categoryName ? categories.find((c) => c.name === product.categoryName)?.id || '' : '',
    brandId: '',
    supplierId: '',
    purchasePrice: product?.purchasePrice ?? 0,
    salePrice: product?.salePrice ?? 0,
    wholesalePrice: product?.wholesalePrice ?? 0,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    unit: product?.unit || 'unidad',
    locationWarehouse: product?.locationWarehouse || '',
    locationAisle: product?.locationAisle || '',
    locationShelf: product?.locationShelf || '',
    locationLevel: product?.locationLevel || '',
    expiryDate: product?.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
    lot: product?.lot || '',
    isBundle: product?.isBundle || false,
    isFavorite: product?.isFavorite || false,
    bundleItems: product?.bundleItems?.map((b) => ({ productId: b.productId, name: b.name, quantity: b.quantity })) || [],
  })
  const [saving, setSaving] = useState(false)

  const allProducts = useQuery<{ products: Array<{ id: string; name: string; stock: number; salePrice: number }> }>({
    queryKey: ['products-all'],
    queryFn: () => apiFetch('/api/products?q='),
    enabled: form.isBundle,
  })

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      const body = { ...form, stock: isEdit ? undefined : form.stock }
      if (isEdit) {
        await apiFetch(`/api/products/${product!.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Producto actualizado')
      } else {
        await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(form) })
        toast.success('Producto creado')
      }
      onSaved()
      // 🔥 Sincronizar inmediatamente a Firebase
      triggerGlobalSync()
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) setForm((f) => ({ ...f, image: data.url }))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} producto</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Precios</TabsTrigger>
            <TabsTrigger value="location">Inventario</TabsTrigger>
            <TabsTrigger value="bundle">Combo</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1 pr-2 scroll-thin">
            <TabsContent value="general" className="space-y-3 mt-2">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Código interno</Label><Input value={form.internalCode} onChange={(e) => setForm({ ...form, internalCode: e.target.value })} placeholder="Auto" /></div>
                <div className="space-y-1.5"><Label>Código de barras</Label><div className="flex gap-1"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Auto" /><Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, barcode: '' })} title="Auto-generar al guardar"><RefreshCw className="w-4 h-4" /></Button></div></div>
              </div>
              <div className="space-y-1.5"><Label>GS1</Label><Input value={form.gs1Code} onChange={(e) => setForm({ ...form, gs1Code: e.target.value })} placeholder="Código GS1 opcional" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Categoría</Label><Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Marca</Label><Select value={form.brandId} onValueChange={(v) => setForm({ ...form, brandId: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Proveedor</Label><Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label>Imagen</Label>
                <div className="flex items-center gap-3">
                  {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded object-cover" />}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-accent"><Upload className="w-4 h-4" />Subir imagen</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-3 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Precio compra</Label><Input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Precio venta</Label><Input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Precio mayorista</Label><Input type="number" step="0.01" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Unidad</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Favorito</Label><div className="flex items-center gap-2 h-9"><Checkbox checked={form.isFavorite} onCheckedChange={(v) => setForm({ ...form, isFavorite: !!v })} /><span className="text-sm">Mostrar en POS</span></div></div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-3 mt-2">
              {!isEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Stock inicial</Label><Input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Stock mínimo</Label><Input type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>
                </div>
              )}
              {isEdit && <div className="space-y-1.5"><Label>Stock mínimo</Label><Input type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>}
              <p className="text-xs text-muted-foreground">Ubicación física</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Almacén</Label><Input value={form.locationWarehouse} onChange={(e) => setForm({ ...form, locationWarehouse: e.target.value })} placeholder="Ej: Almacén A" /></div>
                <div className="space-y-1.5"><Label>Pasillo</Label><Input value={form.locationAisle} onChange={(e) => setForm({ ...form, locationAisle: e.target.value })} placeholder="Ej: Pasillo 2" /></div>
                <div className="space-y-1.5"><Label>Estante</Label><Input value={form.locationShelf} onChange={(e) => setForm({ ...form, locationShelf: e.target.value })} placeholder="Ej: Estante 4" /></div>
                <div className="space-y-1.5"><Label>Nivel</Label><Input value={form.locationLevel} onChange={(e) => setForm({ ...form, locationLevel: e.target.value })} placeholder="Ej: Nivel 3" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Fecha vencimiento</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Lote</Label><Input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="bundle" className="space-y-3 mt-2">
              <div className="flex items-center gap-2"><Checkbox checked={form.isBundle} onCheckedChange={(v) => setForm({ ...form, isBundle: !!v })} /><Label className="cursor-pointer">Este producto es un combo / agrupado</Label></div>
              {form.isBundle && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Componentes del combo (se descontarán del inventario al vender):</p>
                  {form.bundleItems.map((bi, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={bi.productId} onValueChange={(v) => setForm({ ...form, bundleItems: form.bundleItems.map((x, j) => j === i ? { ...x, productId: v, name: allProducts.data?.products.find((p) => p.id === v)?.name || '' } : x) })}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>{(allProducts.data?.products || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" step="0.01" className="w-24" value={bi.quantity} onChange={(e) => setForm({ ...form, bundleItems: form.bundleItems.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x) })} />
                      <Button variant="outline" size="icon" onClick={() => setForm({ ...form, bundleItems: form.bundleItems.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...form, bundleItems: [...form.bundleItems, { productId: '', name: '', quantity: 1 }] })}><Plus className="w-4 h-4 mr-1" />Agregar componente</Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
