'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileSpreadsheet, FileJson, FileText, Download } from 'lucide-react'

const RESOURCES = [
  { value: 'products', label: 'Productos' },
  { value: 'customers', label: 'Clientes' },
  { value: 'sales', label: 'Ventas' },
  { value: 'purchases', label: 'Compras' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'inventory', label: 'Inventario valorizado' },
  { value: 'users', label: 'Usuarios' },
]

const FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'json', label: 'JSON', icon: FileJson },
]

export default function ExportData() {
  const [resource, setResource] = useState('products')
  const [format, setFormat] = useState('xlsx')

  const url = `/api/export?resource=${resource}&format=${format}`

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <Card><CardContent className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold mb-1">Exportar datos</h2>
          <p className="text-sm text-muted-foreground">Selecciona la información y el formato para descargar.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Información a exportar</Label>
          <Select value={resource} onValueChange={setResource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RESOURCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
        </div>

        <div className="space-y-1.5">
          <Label>Formato</Label>
          <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => {
              const Icon = f.icon
              return (
                <label key={f.value} className={`flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer transition-colors ${format === f.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                  <RadioGroupItem value={f.value} className="sr-only" />
                  <Icon className="w-6 h-6" />
                  <span className="text-xs">{f.label}</span>
                </label>
              )
            })}
          </RadioGroup>
        </div>

        <Button asChild className="w-full"><a href={url} download><Download className="w-4 h-4 mr-2" />Descargar {RESOURCES.find((r) => r.value === resource)?.label}</a></Button>
      </CardContent></Card>
    </div>
  )
}
