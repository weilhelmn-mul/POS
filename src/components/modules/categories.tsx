'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/store/auth'
import { apiFetch } from '@/lib/hooks'
import { Plus, Pencil, Trash2, FolderTree, Tag } from 'lucide-react'
import { toast } from 'sonner'

interface Cat { id: string; name: string; parentId: string | null; parent?: { name: string } | null; children?: Cat[]; _count?: { products: number } }
interface Brand { id: string; name: string }
interface Sup { id: string; name: string; document: string | null; phone: string | null; contact: string | null }

export default function Categories() {
  const has = useAuth((s) => s.has)
  const qc = useQueryClient()
  const [tab, setTab] = useState('categories')
  const can = has('categories.manage')

  return (
    <div className="p-4 space-y-4">
      <Tabs value={tab} onChange={setTab} />
      {tab === 'categories' && <CategoriesTab can={can} qc={qc} />}
      {tab === 'brands' && <BrandsTab can={can} qc={qc} />}
      {tab === 'suppliers' && <SuppliersTab can={can} qc={qc} />}
    </div>
  )

  function Tabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex gap-2">
        {[
          { k: 'categories', label: 'Categorías', icon: FolderTree },
          { k: 'brands', label: 'Marcas', icon: Tag },
          { k: 'suppliers', label: 'Proveedores', icon: Plus },
        ].map((t) => {
          const Icon = t.icon
          return <Button key={t.k} variant={value === t.k ? 'default' : 'outline'} onClick={() => onChange(t.k)}><Icon className="w-4 h-4 mr-1" />{t.label}</Button>
        })}
      </div>
    )
  }
}

function CategoriesTab({ can, qc }: { can: boolean; qc: ReturnType<typeof useQueryClient> }) {
  const { data } = useQuery<{ categories: Cat[] }>({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories') })
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Cat | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')

  const openNew = () => { setEdit(null); setName(''); setParentId(''); setOpen(true) }
  const openEdit = (c: Cat) => { setEdit(c); setName(c.name); setParentId(c.parentId || ''); setOpen(true) }

  const save = async () => {
    try {
      if (edit) await apiFetch(`/api/categories/${edit.id}`, { method: 'PUT', body: JSON.stringify({ name, parentId: parentId || null }) })
      else await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name, parentId: parentId || null }) })
      toast.success(edit ? 'Categoría actualizada' : 'Categoría creada')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  const del = async (c: Cat) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return
    try { await apiFetch(`/api/categories/${c.id}`, { method: 'DELETE' }); toast.success('Eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }) }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Categorías y subcategorías</h2>
          {can && <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nueva</Button>}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Padre</TableHead><TableHead>Productos</TableHead>{can && <TableHead className="text-right">Acciones</TableHead>}</TableRow></TableHeader>
          <TableBody>
            {(data?.categories || []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.parent?.name || <span className="text-muted-foreground text-xs">— principal</span>}</TableCell>
                <TableCell><Badge variant="secondary">{c._count?.products || 0}</Badge></TableCell>
                {can && <TableCell className="text-right"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c)}><Trash2 className="w-4 h-4" /></Button></div></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? 'Editar' : 'Nueva'} categoría</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
              <div className="space-y-1.5"><Label>Categoría padre (opcional)</Label>
                <Select value={parentId} onValueChange={setParentId}><SelectTrigger><SelectValue placeholder="— principal —" /></SelectTrigger><SelectContent>
                  {(data?.categories || []).filter((c) => c.id !== edit?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent></Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function BrandsTab({ can, qc }: { can: boolean; qc: ReturnType<typeof useQueryClient> }) {
  const { data } = useQuery<{ brands: Brand[] }>({ queryKey: ['brands'], queryFn: () => apiFetch('/api/brands') })
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  const save = async () => {
    try { await apiFetch('/api/brands', { method: 'POST', body: JSON.stringify({ name }) }); toast.success('Marca creada'); setName(''); setOpen(false); qc.invalidateQueries({ queryKey: ['brands'] }) }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Card><CardContent className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Marcas</h2>
        {can && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Nueva</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(data?.brands || []).map((b) => <Badge key={b.id} variant="secondary" className="text-sm py-1.5 px-3">{b.name}</Badge>)}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nueva marca</DialogTitle></DialogHeader>
          <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  )
}

function SuppliersTab({ can, qc }: { can: boolean; qc: ReturnType<typeof useQueryClient> }) {
  const { data } = useQuery<{ suppliers: Sup[] }>({ queryKey: ['suppliers'], queryFn: () => apiFetch('/api/suppliers') })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', document: '', phone: '', contact: '', email: '', address: '', notes: '' })
  const [editId, setEditId] = useState<string | null>(null)

  const openNew = () => { setEditId(null); setForm({ name: '', document: '', phone: '', contact: '', email: '', address: '', notes: '' }); setOpen(true) }
  const openEdit = (s: Sup) => { setEditId(s.id); setForm({ name: s.name, document: s.document || '', phone: s.phone || '', contact: s.contact || '', email: '', address: '', notes: '' }); setOpen(true) }

  const save = async () => {
    try {
      if (editId) await apiFetch(`/api/suppliers/${editId}`, { method: 'PUT', body: JSON.stringify(form) })
      else await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Guardado'); setOpen(false); qc.invalidateQueries({ queryKey: ['suppliers'] })
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Card><CardContent className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Proveedores</h2>
        {can && <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>}
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Documento</TableHead><TableHead>Teléfono</TableHead><TableHead>Contacto</TableHead>{can && <TableHead className="text-right">Acciones</TableHead>}</TableRow></TableHeader>
        <TableBody>
          {(data?.suppliers || []).map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.document || '—'}</TableCell>
              <TableCell>{s.phone || '—'}</TableCell>
              <TableCell>{s.contact || '—'}</TableCell>
              {can && <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nuevo'} proveedor</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Documento (RUC/DNI)</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Contacto</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  )
}
