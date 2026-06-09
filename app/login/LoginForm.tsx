'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ssoTried = useRef(false)

  const callbackUrl = params.get('callbackUrl') || '/dashboard'

  // Auto-submit do handoff SSO (uid:ts:sig assinados pela rota /sso)
  useEffect(() => {
    const uid = params.get('sso_uid')
    const ts = params.get('sso_ts')
    const sig = params.get('sso_sig')
    if (uid && ts && sig && !ssoTried.current) {
      ssoTried.current = true
      setLoading(true)
      signIn('credentials', {
        email: '__sso__',
        password: `${uid}:${ts}:${sig}`,
        redirect: false,
      }).then((res) => {
        if (res?.ok) router.push(callbackUrl)
        else {
          setError('Sessão SSO inválida ou expirada. Entre manualmente.')
          setLoading(false)
        }
      })
    }
  }, [params, router, callbackUrl])

  useEffect(() => {
    const e = params.get('error')
    if (e === 'session_expired') setError('Sua sessão do Nexus expirou. Entre novamente.')
    else if (e === 'nexus_error') setError('Falha ao validar com o Nexus.')
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) router.push(callbackUrl)
    else {
      setError('Credenciais inválidas ou sem acesso.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>Usuário ou e-mail</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Senha</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
      {error && <p className="error-msg">{error}</p>}
    </form>
  )
}
