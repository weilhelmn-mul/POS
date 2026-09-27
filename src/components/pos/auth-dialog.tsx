'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onAuthorized: (authorizedById: string) => void
  title?: string
  description?: string
}

export function AuthDialog({ open, onClose, onAuthorized, title, description }: AuthDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/authorize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Contraseña incorrecta')
      toast.success('Operación autorizada')
      setPassword('')
      onAuthorized(data.authorizedById)
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(''); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <DialogTitle>{title || 'Autorización requerida'}</DialogTitle>
          <DialogDescription>{description || 'Esta operación requiere la contraseña de autorización de un administrador.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="authpw">Contraseña de autorización</Label>
          <Input id="authpw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password && submit()} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || !password}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
