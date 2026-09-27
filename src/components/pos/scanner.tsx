'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, X, AlertCircle } from 'lucide-react'

export function Scanner({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let mounted = true
    const id = 'qr-reader-el'

    const start = async () => {
      try {
        if (!ref.current) return
        ref.current.id = id
        const html5 = new Html5Qrcode(id, { verbose: false })
        scannerRef.current = html5
        await html5.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded) => {
            if (!mounted) return
            onScan(decoded)
          },
          () => {},
        )
      } catch (e) {
        setError('No se pudo acceder a la cámara. Verifica permisos o usa un lector USB.')
      }
    }
    start()

    return () => {
      mounted = false
      const s = scannerRef.current
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {})
        scannerRef.current = null
      }
    }
  }, [open, onScan])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><Camera className="w-5 h-5" /><span className="font-medium">Escanear código</span></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        {error ? (
          <div className="text-center p-6 text-sm text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            {error}
          </div>
        ) : (
          <div ref={ref} className="w-full aspect-[4/3] bg-black rounded-lg overflow-hidden" />
        )}
        <p className="text-xs text-muted-foreground text-center">Apunta la cámara al código de barras. También puedes usar un lector USB: solo enfoca el buscador y escanea.</p>
      </DialogContent>
    </Dialog>
  )
}
