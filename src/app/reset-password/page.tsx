'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShoppingCart, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const initialToken = params.get('token') || ''
  const { login } = useAuth()
  const [token, setToken] = useState(initialToken)
  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!token) { setVerifying(false); setValid(false); return }
    fetch(`/api/auth/verify-reset?token=${encodeURIComponent(token)}`).then((r) => r.json()).then((d) => { setValid(!!d.ok); if (d.ok) setUsername(d.username || '') }).catch(() => setValid(false)).finally(() => setVerifying(false))
  }, [token])
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) setError(data.error || 'No se pudo actualizar')
      else setDone(true)
    } catch { setError('Error de red.') } finally { setLoading(false) }
  }
  const handleLoginWithNewPassword = async () => { if (!username || !password) { router.push('/'); return } const res = await login(username, password); if (res.ok) router.push('/'); else router.push('/') }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 pt-safe pb-safe">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3"><div className="mx-auto w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"><ShoppingCart className="w-8 h-8" /></div><div><CardTitle className="text-2xl">POS Pro</CardTitle><CardDescription>Restablecer contraseña</CardDescription></div></CardHeader>
        <CardContent>
          {verifying && (<div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" /><p className="text-sm text-muted-foreground">Verificando enlace…</p></div>)}
          {!verifying && valid === false && (<div className="text-center py-6 space-y-4"><div className="mx-auto w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertCircle className="w-8 h-8" /></div><p className="text-sm">El enlace ha expirado o es inválido.</p><Button className="w-full" onClick={() => router.push('/')}>Volver al login</Button></div>)}
          {!verifying && valid && !done && (<form onSubmit={onSubmit} className="space-y-4"><div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">Hola <strong>{username}</strong>. Define una contraseña nueva.</div><div className="space-y-2"><Label>Nueva contraseña</Label><div className="relative"><Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div><div className="space-y-2"><Label>Confirmar contraseña</Label><Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" /></div>{error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}<Button type="submit" className="w-full h-12" disabled={loading || !password || !confirm}>{loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</> : <><KeyRound className="w-4 h-4 mr-2" /> Actualizar contraseña</>}</Button></form>)}
          {done && (<div className="text-center py-6 space-y-4"><div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-8 h-8" /></div><p className="text-sm">Tu contraseña fue actualizada.</p><Button className="w-full h-12" onClick={handleLoginWithNewPassword}>Ir a iniciar sesión</Button></div>)}
        </CardContent>
      </Card>
    </div>
  )
}
export default function ResetPasswordPage() { return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}><ResetPasswordInner /></Suspense>) }
