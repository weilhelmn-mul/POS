'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/hooks'
import { formatDate } from '@/lib/product-status'
import { Plus, Pencil, Trash2, UserCog, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { PermissionKey } from '@/types'

interface UserRow { id: string; username: string; name: string; role: string; permissions: PermissionKey[]; active: boolean; hasAuthPassword: boolean; email: string | null; phone: string | null; createdAt: string }

export default function Users() {
  const qc = useQueryClient()
  const { data } = useQuery<{ users: UserRow[]; permissions: PermissionKey[] }>({ queryKey: ['users'], queryFn: () => apiFetch('/api/users') })
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<UserRow | null>(null)

  const openNew = () => { setEdit(null); setOpen(true) }
  const openEdit = (u: UserRow) => { setEdit(u); setOpen(true) }
  const del = async (u: UserRow) => {
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return
    try { await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' }); toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['users'] }) }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Usuarios del sistema</h2>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nuevo usuario</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Nombre</TableHead><TableHead>Rol</TableHead><TableHead>Permisos</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.users || []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.username}</TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.role === 'admin' ? <Badge className="bg-violet-100 text-violet-700"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge> : <Badge variant="secondary">Vendedor</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.role === 'admin' ? 'Todos' : `${u.permissions.length} permisos`}</TableCell>
                <TableCell><Badge variant={u.active ? 'default' : 'destructive'}>{u.active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(u)}><Trash2 className="w-4 h-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(data?.users || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin usuarios</div>}
      </CardContent></Card>

      {open && <UserDialog key={edit?.id || 'new'} edit={edit} permissions={data?.permissions || []} onClose={() => setOpen(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false) }} />}
    </div>
  )
}

const PERM_GROUPS: Array<{ label: string; perms: PermissionKey[] }> = [
  { label: 'Productos', perms: ['products.view', 'products.create', 'products.edit', 'products.delete', 'prices.edit', 'inventory.edit'] },
  { label: 'Ventas', perms: ['sales.create', 'sales.void', 'sales.view', 'sales.reprint'] },
  { label: 'Clientes', perms: ['customers.create', 'customers.edit', 'customers.delete', 'customers.credit', 'receivables.view'] },
  { label: 'Gestión', perms: ['reports.view', 'expenses.create', 'purchases.create'] },
  { label: 'Sistema', perms: ['users.manage', 'settings.manage', 'backups.manage', 'audit.view', 'bundles.manage', 'categories.manage', 'suppliers.manage'] },
]

const LABELS: Record<string, string> = {
  'products.view': 'Ver', 'products.create': 'Crear', 'products.edit': 'Editar', 'products.delete': 'Eliminar',
  'prices.edit': 'Modificar precios', 'inventory.edit': 'Ajustar inventario',
  'sales.create': 'Hacer ventas', 'sales.void': 'Anular ventas', 'sales.view': 'Ver ventas', 'sales.reprint': 'Reimprimir',
  'customers.create': 'Crear', 'customers.edit': 'Editar', 'customers.delete': 'Eliminar', 'customers.credit': 'Dar crédito', 'receivables.view': 'Ver cuentas',
  'reports.view': 'Ver reportes', 'expenses.create': 'Gastos', 'purchases.create': 'Compras',
  'users.manage': 'Usuarios', 'settings.manage': 'Configuración', 'backups.manage': 'Backups', 'audit.view': 'Auditoría',
  'bundles.manage': 'Combos', 'categories.manage': 'Categorías', 'suppliers.manage': 'Proveedores',
}

function UserDialog({ edit, permissions, onClose, onSaved }: { edit: UserRow | null; permissions: PermissionKey[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => edit ? {
    username: edit.username, name: edit.name, password: '', role: edit.role, active: edit.active,
    email: edit.email || '', phone: edit.phone || '', authPassword: '', permissions: edit.permissions,
  } : { username: '', name: '', password: '', role: 'vendor', active: true, email: '', phone: '', authPassword: '', permissions: [] as PermissionKey[] })
  const [saving, setSaving] = useState(false)

  const toggle = (p: PermissionKey) => setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }))

  const save = async () => {
    if (!form.username || !form.name || (!edit && !form.password)) { toast.error('Completa usuario, nombre y contraseña'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: form.name, role: form.role, active: form.active, email: form.email, phone: form.phone, permissions: form.permissions }
      if (form.password) body.password = form.password
      if (form.authPassword) body.authPassword = form.authPassword
      if (edit) await apiFetch(`/api/users/${edit.id}`, { method: 'PUT', body: JSON.stringify(body) })
      else { body.username = form.username; body.password = form.password; await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) }) }
      toast.success(edit ? 'Usuario actualizado' : 'Usuario creado')
      onSaved()
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{edit ? 'Editar' : 'Nuevo'} usuario</DialogTitle></DialogHeader>
        <ScrollArea className="flex-1 pr-2 scroll-thin">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Usuario *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!edit} /></div>
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Contraseña {edit ? '(dejar vacío para no cambiar)' : '*'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Contraseña de autorización</Label><Input type="password" value={form.authPassword} onChange={(e) => setForm({ ...form, authPassword: e.target.value })} placeholder="Secundaria (opcional)" /></div>
              <div className="space-y-1.5"><Label>Rol</Label><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="vendor">Vendedor</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Activo</Label><div className="flex items-center gap-2 h-9"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><span className="text-sm">{form.active ? 'Activo' : 'Inactivo'}</span></div></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>

            {form.role === 'vendor' && (
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Permisos por módulo</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PERM_GROUPS.map((g) => (
                    <div key={g.label} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{g.label}</p>
                      {g.perms.map((p) => (
                        <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={form.permissions.includes(p)} onCheckedChange={() => toggle(p)} />
                          {LABELS[p] || p}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {form.role === 'admin' && <p className="text-sm text-muted-foreground bg-violet-50 p-2 rounded">El administrador tiene acceso a todos los módulos automáticamente.</p>}
          </div>
        </ScrollArea>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
