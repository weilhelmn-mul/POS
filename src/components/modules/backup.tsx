'use client'
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Confirm } from '@/components/pos/confirm'
import { apiFetch } from '@/lib/hooks'
import { formatDateTime } from '@/lib/product-status'
import { DatabaseBackup, Download, Upload, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function Backup() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [replaceUsers, setReplaceUsers] = useState(false)

  const { data, refetch } = useQuery<{ backups: Array<{ id: string; filename: string; size: number; auto: boolean; createdAt: string }> }>({
    queryKey: ['backups'], queryFn: () => apiFetch('/api/backup'),
  })

  const create = async (auto = false) => {
    try {
      await apiFetch('/api/backup', { method: 'POST', body: JSON.stringify({ auto }) })
      toast.success('Copia de seguridad creada')
      refetch()
    } catch (e) { toast.error((e as Error).message) }
  }

  const restore = async () => {
    if (!pending) return
    try {
      const res = await apiFetch<{ counts: Record<string, number> }>('/api/backup/restore', { method: 'POST', body: JSON.stringify({ json: pending, replaceUsers }) })
      toast.success(`Restaurado: ${JSON.stringify(res.counts)}`)
      setPending(null); setConfirmOpen(false)
      qc.invalidateQueries()
    } catch (e) { toast.error((e as Error).message) }
  }

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      try { JSON.parse(text); setPending(text); setConfirmOpen(true) }
      catch { toast.error('Archivo de backup inválido') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl">
      <Card><CardContent className="p-4 flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><DatabaseBackup className="w-6 h-6" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Crear copia de seguridad</p>
          <p className="text-sm text-muted-foreground">Guarda toda la información en un archivo JSON.</p>
        </div>
        <Button onClick={() => create(false)}><Plus className="w-4 h-4 mr-1" />Crear ahora</Button>
      </CardContent></Card>

      <Card><CardContent className="p-4 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/40">
        <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Upload className="w-6 h-6" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Restaurar copia</p>
          <p className="text-sm text-muted-foreground">Selecciona un archivo JSON de backup. Se reemplazarán los datos actuales.</p>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>Seleccionar archivo</Button>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <div className="p-4 border-b"><h3 className="font-semibold">Copias guardadas</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>Archivo</TableHead><TableHead>Tamaño</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.backups || []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.filename}</TableCell>
                <TableCell>{(b.size / 1024).toFixed(1)} KB</TableCell>
                <TableCell>{b.auto ? <Badge variant="secondary">Automática</Badge> : <Badge>Manual</Badge>}</TableCell>
                <TableCell className="text-xs">{formatDateTime(b.createdAt)}</TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <a href={`/api/backup/${b.id}`} download><Button size="icon" variant="ghost"><Download className="w-4 h-4" /></Button></a>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(data?.backups || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><DatabaseBackup className="w-10 h-10 mx-auto mb-2 opacity-30" />Aún no hay copias</div>}
      </CardContent></Card>

      <Confirm
        open={confirmOpen}
        title="Restaurar copia de seguridad"
        description="Esta acción reemplazará TODA la información actual. ¿Estás seguro de continuar?"
        confirmText="Restaurar"
        destructive
        onCancel={() => { setConfirmOpen(false); setPending(null) }}
        onConfirm={restore}
      />
      {confirmOpen && (
        <Card className="border-amber-300 bg-amber-50 fixed bottom-4 right-4 z-50 w-72">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={replaceUsers} onCheckedChange={setReplaceUsers} />
              Reemplazar también usuarios
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
