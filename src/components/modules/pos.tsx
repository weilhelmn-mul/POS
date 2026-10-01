'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCart } from '@/store/cart'
import { useBusiness, apiFetch } from '@/lib/hooks'
import { formatCurrency } from '@/lib/product-status'
import { Scanner } from '@/components/pos/scanner'
import { PaymentDialog } from '@/components/pos/payment-dialog'
import { PrintPreview, type PrintSale } from '@/components/pos/print'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, ScanLine, Trash2, ShoppingCart, UserRound, X, Printer, Pause, Ban, Tag, CreditCard, Minus, UserPlus, Loader2, AlertCircle, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, Zap, Wifi, WifiOff, Loader2 as Spinner } from 'lucide-react'
import { toast } from 'sonner'
import { triggerGlobalSync } from '@/hooks/use-global-sync'
import { useUI } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { CartItem, PaymentSplit, ProductWithStatus } from '@/types'

export default function Pos() {
  const qc = useQueryClient()
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const { sales, activeId, active, newSale, selectSale, closeSale, addItem, updateQty, updatePrice, removeItem, setCustomer, setDiscount, clearActive, setObservations } = useCart()
  const { productsCollapsed, toggleProductsCollapsed, cartCollapsed, toggleCartCollapsed, scannerEnabled, toggleScanner } = useUI()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [showFav, setShowFav] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [custOpen, setCustOpen] = useState(false)
  const [discOpen, setDiscOpen] = useState(false)
  const [printSale, setPrintSale] = useState<PrintSale | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeSale = active()
  const items = activeSale?.items || []
  const subtotal = +items.reduce((s, i) => s + i.total, 0).toFixed(2)
  const discount = activeSale?.discount || 0
  const total = Math.max(0, +(subtotal - discount).toFixed(2))

  const { data: products } = useQuery<{ products: ProductWithStatus[] }>({
    queryKey: ['products', q || ' ', undefined, undefined],
    queryFn: async () => {
      const p = new URLSearchParams({ q })
      if (showFav) p.set('favorites', '1')
      return apiFetch(`/api/products?${p}`)
    },
  })
  const { data: cats } = useQuery<{ categories: Array<{ id: string; name: string }> }>({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories') })
  const { data: custData } = useQuery<{ customers: Array<{ id: string; name: string; document: string | null; creditBalance: number; creditLimit: number }> }>({ queryKey: ['customers'], queryFn: () => apiFetch('/api/customers') })

  const filtered = useMemo(() => {
    let list = products?.products || []
    if (cat !== 'all') list = list.filter((p) => p.categoryName === cats?.categories.find((c) => c.id === cat)?.name)
    return list
  }, [products, cat, cats])

  const addToCart = (p: ProductWithStatus) => {
    if (p.isBundle) {
      const bundleItems = p.bundleItems || []
      // verificar stock de componentes
      for (const bi of bundleItems) {
        if ((bi.stock ?? 0) < bi.quantity) {
          toast.error(`Sin stock suficiente de ${bi.name} para el combo`)
          return
        }
      }
      const item: CartItem = {
        productId: p.id, name: p.name, quantity: 1, unitPrice: p.salePrice, discount: 0,
        total: p.salePrice, image: p.image, stock: p.stock, isBundle: true,
      }
      addItem(item)
      toast.success(`${p.name} agregado`)
      return
    }
    if (p.stock <= 0) { toast.error(`${p.name} sin stock`); return }
    const existing = items.find((i) => i.productId === p.id)
    if (existing && existing.quantity + 1 > p.stock) { toast.error(`Solo hay ${p.stock} en stock`); return }
    const item: CartItem = {
      productId: p.id, name: p.name, quantity: 1, unitPrice: p.salePrice, discount: 0,
      total: p.salePrice, image: p.image, stock: p.stock,
    }
    addItem(item)
  }

  const handleScan = (code: string) => {
    const found = (products?.products || []).find((p) => p.barcode === code || p.internalCode === code)
    if (found) {
      addToCart(found)
      setScannerOpen(false)
    } else {
      // buscar en backend por barcode
      apiFetch<{ products: ProductWithStatus[] }>(`/api/products?q=${encodeURIComponent(code)}`).then((d) => {
        if (d.products[0]) { addToCart(d.products[0]); setScannerOpen(false) }
        else toast.error(`No se encontró producto con código ${code}`)
      })
    }
  }

  // Soporte para lector USB (simula tipeo rápido + Enter) cuando el input de búsqueda está enfocado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 🔥 Si el lector está apagado, no procesar códigos
      if (!scannerEnabled) return
      if (e.key === 'Enter' && document.activeElement === searchRef.current && q) {
        const found = (products?.products || []).find((p) => p.barcode === q || p.internalCode === q)
        if (found) { addToCart(found); setQ('') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, products, scannerEnabled])

  // Auto-add cuando el lector USB termina de escribir (sin necesidad de Enter)
  // Algunos lectores no envían Enter al final; este debounce de 200ms cubre ese caso.
  // Solo dispara si: scanner activo + input enfocado (ej: tras clic en "Carrito vacío")
  // + el código coincide EXACTAMENTE con un barcode/internalCode de un producto.
  // addItem() en el store ya incrementa cantidad si el producto ya está en el carrito.
  useEffect(() => {
    if (!scannerEnabled || !q) return
    // Buscar coincidencia exacta (barcode o internalCode)
    const found = (products?.products || []).find((p) => p.barcode === q || p.internalCode === q)
    if (!found) return
    // Esperar 200ms por si vienen más caracteres (el lector escribe rápido)
    const timer = setTimeout(() => {
      // Re-verificar foco al disparar (el usuario pudo haber hecho clic en otro lado)
      if (document.activeElement !== searchRef.current) return
      addToCart(found)
      setQ('')
    }, 200)
    return () => clearTimeout(timer)
  }, [q, products, scannerEnabled])

  const confirmSale = async (splits: PaymentSplit[], method: string) => {
    if (!activeSale || items.length === 0) { toast.error('Carrito vacío'); return }
    const payload = {
      items: items.map((i) => ({
        productId: i.productId, name: i.name, quantity: i.quantity,
        unitPrice: i.unitPrice, discount: i.discount, isBundle: i.isBundle,
        bundleItems: i.isBundle ? (products?.products.find((p) => p.id === i.productId)?.bundleItems || []) : undefined,
      })),
      customerId: activeSale.customerId || null,
      discount,
      paymentMethod: method,
      payments: method === 'credit' ? [] : splits,
      observations: activeSale.observations,
    }
    try {
      const res = await apiFetch<{ sale: PrintSale }>('/api/sales', { method: 'POST', body: JSON.stringify(payload) })
      toast.success(`Venta ${res.sale.invoiceNumber} registrada`)
      closeSale(activeSale.id)
      if (sales.length === 1) newSale()
      setPayOpen(false)
      setPrintSale(res.sale)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      // 🔥 Trigger sync inmediato a Firebase (no esperar al auto-sync de N minutos)
      triggerGlobalSync()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Productos */}
      <div className={cn('flex flex-col min-w-0 border-r transition-[width] duration-200', productsCollapsed ? 'w-12 shrink-0' : 'flex-1')}>
        {productsCollapsed ? (
          <button onClick={() => toggleProductsCollapsed()} className="w-12 h-full flex items-center justify-center border-r bg-card hover:bg-accent" title="Mostrar productos">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="p-3 space-y-2 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input ref={searchRef} placeholder="Buscar o escanear código..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 pr-2" autoFocus />
                </div>
                {/* Scanner ON/OFF + LED */}
                <ScannerToggle enabled={scannerEnabled} onToggle={toggleScanner} />
                <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Escanear con cámara"><ScanLine className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => toggleProductsCollapsed()} title="Plegar productos">
                  <PanelLeftClose className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
            <Button size="sm" variant={cat === 'all' ? 'default' : 'outline'} onClick={() => setCat('all')}>Todos</Button>
            <Button size="sm" variant={showFav ? 'secondary' : 'outline'} onClick={() => setShowFav((v) => !v)}>★ Favoritos</Button>
            {(cats?.categories || []).map((c) => (
              <Button key={c.id} size="sm" variant={cat === c.id ? 'default' : 'outline'} onClick={() => setCat(c.id)}>{c.name}</Button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="text-left">
                <Card className="overflow-hidden hover:shadow-md hover:border-primary/40 transition-all h-full">
                  <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />}
                    {p.stock <= 0 && <Badge className="absolute top-1 right-1 bg-red-500">Agotado</Badge>}
                    {p.isBundle && <Badge className="absolute top-1 left-1">COMBO</Badge>}
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs font-medium leading-tight line-clamp-2 h-8">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-sm">{formatCurrency(p.salePrice, currency)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.stock}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10 text-sm">No hay productos</div>}
          </div>
        </ScrollArea>
          </>
        )}
      </div>

      {/* Carrito */}
      <div className={cn('flex flex-col bg-card transition-[width] duration-200', cartCollapsed ? 'w-44' : 'w-full max-w-md')}>
        {/* Header carrito con botón plegar */}
        {cartCollapsed ? (
          <div className="flex flex-col h-full p-2 gap-3 items-center justify-between">
            <button onClick={() => toggleCartCollapsed()} className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="Desplegar carrito">
              <PanelRightOpen className="w-4 h-4" />
            </button>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="relative">
                <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                {items.length > 0 && <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-5 text-center">{items.length}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {items.length === 0 ? 'Vacío' : `${items.length} prod.`}
              </span>
              {items.length > 0 && (
                <span className="text-sm font-bold text-center">{formatCurrency(total, currency)}</span>
              )}
            </div>
            <Button onClick={() => setPayOpen(true)} disabled={!items.length} size="sm" className="w-full h-9 p-0">
              <CreditCard className="w-4 h-4" />
            </Button>
            <button onClick={() => toggleCartCollapsed()} className="text-[10px] text-muted-foreground hover:text-foreground" title="Desplegar">⤢</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-xs font-semibold text-muted-foreground">{items.length} producto(s) · {formatCurrency(total, currency)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCartCollapsed()} title="Plegar carrito">
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
            {/* Tabs de ventas abiertas */}
            <div className="flex gap-1 p-2 border-b overflow-x-auto scroll-thin">
          {sales.map((s) => (
            <button key={s.id} onClick={() => selectSale(s.id)} className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap border ${s.id === activeId ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
              {s.customerName}
              <span className="ml-1 opacity-60">({s.items.length})</span>
            </button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => newSale()}><Plus className="w-4 h-4" /></Button>
        </div>

        {/* Cliente */}
        <div className="px-3 py-2 border-b">
          <button onClick={() => setCustOpen(true)} className="w-full flex items-center gap-2 text-sm text-left hover:bg-accent rounded p-1.5">
            <UserRound className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 truncate">{activeSale?.customerName || 'Consumidor'}</span>
            {activeSale?.customerId && <Badge variant="outline" className="text-[10px]">cambiar</Badge>}
          </button>
        </div>

        {/* Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {items.length === 0 && (
              <button onClick={() => searchRef.current?.focus()} className="w-full text-center text-muted-foreground py-12 text-sm hover:bg-accent rounded-lg transition-colors cursor-pointer">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Carrito vacío</p>
                <p className="text-[10px] mt-1 text-primary">Clic aquí para buscar producto</p>
              </button>
            )}
            {items.map((it) => (
              <div key={it.productId} className="flex gap-2 p-2 rounded-md border bg-background">
                <div className="w-10 h-10 rounded bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                  {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <ShoppingCart className="w-4 h-4 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-1">{it.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center border rounded">
                      <button className="px-1.5 py-0.5 hover:bg-accent" onClick={() => updateQty(it.productId, it.quantity - 1)}><Minus className="w-3 h-3" /></button>
                      <input type="number" step="0.01" value={it.quantity} onChange={(e) => updateQty(it.productId, +e.target.value)} className="w-12 text-center text-xs bg-transparent outline-none" />
                      <button className="px-1.5 py-0.5 hover:bg-accent" onClick={() => updateQty(it.productId, it.quantity + 1)}><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">× {formatCurrency(it.unitPrice, currency)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="text-sm font-semibold">{formatCurrency(it.total, currency)}</span>
                  <div className="flex gap-1">
                    <button className="text-[10px] text-muted-foreground hover:text-primary" onClick={() => { const np = prompt('Nuevo precio:', it.unitPrice); if (np) updatePrice(it.productId, +np) }}><Tag className="w-3 h-3" /></button>
                    <button className="text-destructive" onClick={() => removeItem(it.productId)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Totales + acciones */}
        <div className="border-t p-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
          <button className="flex justify-between text-sm w-full hover:text-primary" onClick={() => setDiscOpen(true)}>
            <span className="text-muted-foreground">Descuento</span><span>-{formatCurrency(discount, currency)}</span>
          </button>
          <div className="flex justify-between text-lg font-bold border-t pt-1"><span>Total</span><span>{formatCurrency(total, currency)}</span></div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={() => setPayOpen(true)} disabled={!items.length} className="col-span-2 h-11 text-base"><CreditCard className="w-4 h-4 mr-2" />Cobrar</Button>
            <Button variant="outline" disabled={!items.length} onClick={() => { toast.success('Venta suspendida'); selectSale(activeSale!.id) }}><Pause className="w-4 h-4 mr-1" />Suspender</Button>
            <Button variant="outline" disabled={!items.length} onClick={() => clearActive()}><Ban className="w-4 h-4 mr-1" />Cancelar</Button>
          </div>
        </div>
          </>
        )}
      </div>

      <Scanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

      {payOpen && <PaymentDialog open total={total} onClose={() => setPayOpen(false)} onConfirm={confirmSale} canCredit={!!activeSale?.customerId} />}

      {/* Cliente picker */}
      {custOpen && <CustomerPicker
        customers={custData?.customers || []}
        selectedId={activeSale?.customerId || null}
        onClose={() => setCustOpen(false)}
        onPick={(c) => { setCustomer(c?.id || null, c?.name || 'Consumidor'); setCustOpen(false) }}
      />}

      {/* Descuento */}
      {discOpen && <DiscountDialog current={discount} onClose={() => setDiscOpen(false)} onSet={(v) => { setDiscount(v); setDiscOpen(false) }} />}

      {printSale && business && <PrintPreview sale={printSale} business={business} open={!!printSale} onClose={() => setPrintSale(null)} />}
    </div>
  )
}

function CustomerPicker({ customers, selectedId, onClose, onPick }: {
  customers: Array<{ id: string; name: string; document: string | null; creditBalance: number; creditLimit: number }>
  selectedId: string | null; onClose: () => void; onPick: (c: { id: string; name: string } | null) => void
}) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', document: '', phone: '', email: '', address: '', creditLimit: '0', notes: '',
  })

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.document || '').includes(q))

  const handleCreate = async () => {
    setFormErr(null)
    if (!form.name.trim()) {
      setFormErr('El nombre del cliente es obligatorio')
      return
    }
    setCreating(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        document: form.document.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        creditLimit: Number(form.creditLimit) || 0,
        notes: form.notes.trim() || null,
      }
      const res = await apiFetch<{ customer: { id: string; name: string } }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      // Refrescar la lista de clientes en cache
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success(`Cliente "${res.customer.name}" registrado`)
      // Seleccionar el nuevo cliente automáticamente y cerrar el picker
      onPick({ id: res.customer.id, name: res.customer.name })
    } catch (e: any) {
      const msg = (e as Error).message || 'Error al crear cliente'
      setFormErr(msg)
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', document: '', phone: '', email: '', address: '', creditLimit: '0', notes: '' })
    setFormErr(null)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-card border-l p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">{showForm ? 'Nuevo cliente' : 'Cliente'}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { showForm ? (setShowForm(false), resetForm()) : onClose() }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {showForm ? (
          // ─── Formulario inline de nuevo cliente ───
          <div className="flex flex-col gap-2 overflow-y-auto scroll-thin pb-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
              <Input
                placeholder="Nombre completo o razón social"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                disabled={creating}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Documento (DNI/RUC)</label>
              <Input
                placeholder="12345678 o 20123456789"
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                disabled={creating}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                <Input
                  placeholder="999 888 777"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Límite crédito</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  disabled={creating}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={creating}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dirección</label>
              <Input
                placeholder="Av. Principal 123"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={creating}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas</label>
              <Input
                placeholder="Observaciones internas (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                disabled={creating}
              />
            </div>

            {formErr && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3 shrink-0" />
                <span>{formErr}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowForm(false); resetForm() }}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
              >
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                Guardar y seleccionar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              El cliente quedará seleccionado automáticamente en la venta actual.
            </p>
          </div>
        ) : (
          // ─── Lista de clientes (modo original) ───
          <>
            <Button
              variant="outline"
              className="w-full mb-2 border-dashed justify-start text-sm"
              onClick={() => setShowForm(true)}
            >
              <UserPlus className="w-4 h-4 mr-2 text-emerald-600" />
              Agregar nuevo cliente
            </Button>
            <Input placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
            <ScrollArea className="flex-1">
              <button onClick={() => onPick(null)} className="w-full text-left p-2 hover:bg-accent rounded text-sm border mb-1">Consumidor final</button>
              {filtered.map((c) => (
                <button key={c.id} onClick={() => onPick(c)} className={`w-full text-left p-2 hover:bg-accent rounded text-sm border mb-1 ${selectedId === c.id ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.document || '—'} {c.creditBalance > 0 && <span className="text-red-500">· Debe {formatCurrency(c.creditBalance)}</span>}</div>
                </button>
              ))}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}

function DiscountDialog({ current, onClose, onSet }: { current: number; onClose: () => void; onSet: (v: number) => void }) {
  const [v, setV] = useState(current)
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border rounded-lg p-4 w-72">
        <p className="font-semibold mb-2">Descuento</p>
        <Input type="number" step="0.01" value={v} onChange={(e) => setV(+e.target.value)} autoFocus />
        <div className="flex gap-2 mt-3">
          <Button variant="outline" className="flex-1" onClick={() => onSet(0)}>Quitar</Button>
          <Button className="flex-1" onClick={() => onSet(Math.max(0, v))}>Aplicar</Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Botón toggle del lector de código de barras con LED indicador de estado.
 *
 * Estados:
 * - ON + online: LED verde "CONECTADO" (parpadea cuando recibe input)
 * - ON + offline: LED ámbar "DESCONECTADO"
 * - OFF: LED gris "APAGADO"
 */
function ScannerToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [recentlyScanned, setRecentlyScanned] = useState(false)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // LED color depending on state
  let ledColor = 'bg-muted-foreground'
  let ledLabel = 'APAGADO'
  let ledTitle = 'Lector apagado'
  if (enabled) {
    if (online) {
      ledColor = recentlyScanned ? 'bg-emerald-400' : 'bg-emerald-500'
      ledLabel = 'CONECTADO'
      ledTitle = 'Lector conectado y activo'
    } else {
      ledColor = 'bg-amber-500'
      ledLabel = 'DESCONECTADO'
      ledTitle = 'Sin conexión a Internet'
    }
  }

  return (
    <button
      onClick={onToggle}
      title={ledTitle}
      className={cn(
        'flex items-center gap-1.5 h-9 px-2 rounded-md border text-xs font-medium transition-colors',
        enabled
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-input bg-background text-muted-foreground hover:bg-accent'
      )}
    >
      {/* LED */}
      <span className={cn('size-2 rounded-full transition-colors', ledColor, enabled && online && 'animate-pulse-soft')} />
      <span className="hidden sm:inline">{ledLabel}</span>
      <ScanLine className={cn('w-4 h-4', !enabled && 'opacity-50')} />
    </button>
  )
}
