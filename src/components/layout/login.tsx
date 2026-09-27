'use client'
import { useState } from 'react'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShoppingCart, Loader2, Eye, EyeOff } from 'lucide-react'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await login(username.trim(), password)
    setLoading(false)
    if (!res.ok) setError(res.error || 'Error')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-2xl">POS Pro</CardTitle>
            <CardDescription>Ventas, Inventario y Punto de Venta</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Usuario</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="admin / vendedor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Contraseña</Label>
              <div className="relative">
                <Input id="p" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading || !username || !password}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
            </Button>
            <div className="text-xs text-center text-muted-foreground pt-2 border-t space-y-1">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Vendedor:</strong> vendedor / vendedor123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
