'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, X, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react'
interface ScannerProps { open: boolean; onClose: () => void; onScan: (code: string) => void }
export function Scanner({ open, onClose, onScan }: ScannerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 })
  const [error, setError] = useState('')
  const [lastCode, setLastCode] = useState<string>('')
  const [scanCount, setScanCount] = useState(0)
  const beepRef = useRef<((success: boolean) => void) | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      beepRef.current = (success: boolean) => { try { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = success ? 880 : 220; gain.gain.setValueAtTime(0.18, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.25)); osc.start(); osc.stop(ctx.currentTime + (success ? 0.12 : 0.25)) } catch {} }
    } catch {}
    return () => { try { beepRef.current = null } catch {} }
  }, [])
  const handleDetected = useCallback((decoded: string) => { const now = Date.now(); if (lastScanRef.current.code === decoded && now - lastScanRef.current.ts < 800) return; lastScanRef.current = { code: decoded, ts: now }; setLastCode(decoded); setScanCount((c) => c + 1); beepRef.current?.(true); onScan(decoded) }, [onScan])
  useEffect(() => {
    if (!open) return
    let mounted = true; const id = 'qr-reader-el'
    const start = async () => { try { if (!ref.current) return; ref.current.id = id; const html5 = new Html5Qrcode(id, { verbose: false }); scannerRef.current = html5; await html5.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 160 } }, (decoded) => { if (mounted) handleDetected(decoded) }, () => {}) } catch (e) { setError('No se pudo acceder a la cámara. Verifica permisos o usa un lector USB.') } }
    start()
    return () => { mounted = false; const s = scannerRef.current; if (s) { s.stop().then(() => s.clear()).catch(() => {}); scannerRef.current = null } }
  }, [open, handleDetected])
  useEffect(() => { if (open) { setError(''); setLastCode(''); setScanCount(0) } }, [open])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Camera className="w-5 h-5" /><span className="font-medium">Escanear código</span>{scanCount > 0 && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold"><CheckCircle2 className="w-3 h-3" /> {scanCount} {scanCount === 1 ? 'escaneo' : 'escaneos'}</span>}</div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Cerrar"><X className="w-4 h-4" /></Button>
        </div>
        {error ? (<div className="text-center p-6 text-sm text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />{error}</div>) : (<>
          <div ref={ref} className="w-full aspect-[4/3] bg-black rounded-lg overflow-hidden relative"><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="w-[70%] h-[55%] border-2 border-emerald-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" /></div></div>
          {lastCode && (<div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-xs font-mono text-emerald-800 truncate">Último: {lastCode}</span></div>)}
          <p className="text-xs text-muted-foreground text-center mt-3"><ScanLine className="w-3 h-3 inline mr-1" />Escaneo continuo activo — permanece abierto para sumar productos.</p>
        </>)}
      </DialogContent>
    </Dialog>
  )
}
