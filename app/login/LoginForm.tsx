'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '../(app)/Logo'
import './login.css'

function greeting(h: number) {
  if (h < 5) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const GLYPHS = [
  { left: 8, size: 24, dur: 19, delay: 0, type: 'trophy' },
  { left: 22, size: 18, dur: 24, delay: 5, type: 'star' },
  { left: 39, size: 20, dur: 21, delay: 10, type: 'trend' },
  { left: 61, size: 22, dur: 26, delay: 2, type: 'medal' },
  { left: 78, size: 18, dur: 18, delay: 8, type: 'star' },
  { left: 91, size: 24, dur: 23, delay: 13, type: 'trophy' },
  { left: 51, size: 16, dur: 28, delay: 15, type: 'trend' },
]

// posições de tick do gauge (semicírculo superior, centro 90,90 raio 72)
const TICKS = [180, 135, 90, 45, 0].map((deg) => {
  const a = (deg * Math.PI) / 180
  const r1 = 72
  const r2 = 63
  return {
    x1: 90 + r1 * Math.cos(a),
    y1: 90 - r1 * Math.sin(a),
    x2: 90 + r2 * Math.cos(a),
    y2: 90 - r2 * Math.sin(a),
  }
})

const KPIS = [
  { label: 'Produtividade', d: [40, 70, 55, 90, 75] },
  { label: 'Assiduidade', d: [60, 50, 80, 65, 95] },
  { label: 'Engajamento', d: [50, 75, 60, 85, 70] },
]

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState('--:--:--')
  const [hello, setHello] = useState('Bem-vindo')
  const [score, setScore] = useState(0)
  const ssoTried = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const callbackUrl = params.get('callbackUrl') || '/dashboard'

  // Auto-submit do handoff SSO (uid:ts:sig assinados pela rota /sso) — PRESERVADO
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

  // relógio + saudação
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    setHello(greeting(new Date().getHours()))
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // número do gauge contando (sincronizado com o preenchimento do arco)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setScore(94)
      return
    }
    let raf = 0
    let start = 0
    const target = 94
    const dur = 1800
    const delay = 250
    const step = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, Math.max(0, (t - start - delay) / dur))
      const eased = 1 - Math.pow(1 - p, 3)
      setScore(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // fundo: rede de nós + anéis girando + barras (analytics premium)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = cv.clientWidth
      h = cv.clientHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const palette = ['#f5a623', '#ffce6e', '#36b9a6', '#e0941a']
    const N = 64
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.26,
      vy: (Math.random() - 0.5) * 0.26,
      r: 1 + Math.random() * 1.7,
      c: palette[Math.floor(Math.random() * palette.length)],
    }))

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)

      // anéis concêntricos girando (radar executivo)
      const cx = w / 2
      const cy = h / 2
      ctx.save()
      ctx.translate(cx, cy)
      for (let k = 0; k < 3; k++) {
        const rr = Math.min(w, h) * (0.18 + k * 0.12)
        ctx.rotate(t * 0.00006 * (k % 2 ? -1 : 1))
        ctx.beginPath()
        ctx.setLineDash([2, 14])
        ctx.arc(0, 0, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(245, 166, 35, ${0.08 - k * 0.02})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()

      // rede de nós
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = pts[i]
          const b = pts[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 128 * 128) {
            const al = (1 - Math.sqrt(d2) / 128) * 0.18
            ctx.strokeStyle = `rgba(230, 180, 90, ${al})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c
        ctx.globalAlpha = 0.6
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // barras na base
      const bars = Math.max(12, Math.floor(w / 64))
      const bw = w / bars
      for (let i = 0; i < bars; i++) {
        const bh = (Math.sin(i * 0.8 + t * 0.0013) * 0.5 + 0.5) * h * 0.08 + 6
        ctx.fillStyle = 'rgba(245, 166, 35, 0.06)'
        ctx.fillRect(i * bw + bw * 0.32, h - bh, bw * 0.36, bh)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) {
      setEntering(true)
      setTimeout(() => router.push(callbackUrl), 850)
    } else {
      setError('Credenciais inválidas ou sem acesso.')
      setLoading(false)
    }
  }

  const busy = loading || entering

  return (
    <>
      <div className="tcl-bg" aria-hidden="true">
        <canvas ref={canvasRef} className="tcl-canvas" />
        {GLYPHS.map((g, i) => (
          <span
            key={i}
            className="tcl-float"
            style={{ left: `${g.left}%`, animationDuration: `${g.dur}s`, animationDelay: `${g.delay}s` }}
          >
            <Glyph type={g.type} size={g.size} />
          </span>
        ))}
      </div>

      <div className="tcl-top">
        <div className="tcl-seal">
          <span className="dot" />
          Painel Executivo
        </div>
        <div className="tcl-clock">{clock}</div>
      </div>

      <div className="tcl-page">
        <div className="tcl-card">
          <div className="tcl-brand">
            <span className="tcl-logo">
              <span className="ring" />
              <Logo size={44} radius={12} />
            </span>
            <h1>
              TalentCare
              <span className="sub">Performance de pessoas · Itamarathy</span>
            </h1>
          </div>

          <p className="tcl-greet">{hello} — sua visão executiva de performance</p>

          <div className="tcl-gauge" aria-hidden="true">
            <svg viewBox="0 0 180 116">
              <defs>
                <linearGradient id="tcl-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#d98a15" />
                  <stop offset="0.6" stopColor="#f5a623" />
                  <stop offset="1" stopColor="#ffd98a" />
                </linearGradient>
              </defs>
              {TICKS.map((tk, i) => (
                <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="rgba(245,166,35,0.3)" strokeWidth="2" strokeLinecap="round" />
              ))}
              <path className="tcl-arc-track" d="M 18 90 A 72 72 0 0 1 162 90" fill="none" strokeWidth="10" strokeLinecap="round" />
              <path className="tcl-arc-val" d="M 18 90 A 72 72 0 0 1 162 90" fill="none" strokeWidth="10" strokeLinecap="round" />
              <line className="tcl-needle" x1="90" y1="90" x2="90" y2="34" stroke="#ffd98a" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="90" cy="90" r="6" fill="#ffd98a" />
              <circle cx="90" cy="90" r="11" fill="none" stroke="rgba(255,217,138,0.3)" strokeWidth="2" />
            </svg>
            <div className="num">
              <b>{score}</b>
              <i>%</i>
            </div>
            <div className="cap">índice de performance</div>
          </div>

          <div className="tcl-kpis" aria-hidden="true">
            {KPIS.map((k, ki) => (
              <div className="tcl-kpi" key={ki}>
                <div className="spark">
                  {k.d.map((_, bi) => (
                    <i key={bi} style={{ animationDelay: `${ki * 0.2 + bi * 0.12}s` }} />
                  ))}
                </div>
                <span>{k.label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit}>
            <div className="tcl-field">
              <label className="tcl-label">Usuário ou e-mail</label>
              <div className="tcl-input-wrap">
                <IconUser />
                <input
                  className="tcl-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  placeholder="seu.usuario"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="tcl-field">
              <label className="tcl-label">Senha</label>
              <div className="tcl-input-wrap">
                <IconLock />
                <input
                  className="tcl-input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="tcl-eye"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPwd ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <button className="tcl-btn" type="submit" disabled={busy}>
              {loading ? (
                <span className="tcl-btn-loading">
                  <i /><i /><i /><i />
                </span>
              ) : (
                'Entrar'
              )}
            </button>

            {error && <p className="tcl-error">{error}</p>}
            <p className="tcl-hint">Acesso pelo portal Nexus (login único).</p>
          </form>

          {entering && (
            <div className="tcl-enter">
              <div>
                <div className="ring" />
                <p>Bem-vindo de volta</p>
                <small>Preparando seu painel executivo…</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── glifos executivos ── */
function Glyph({ type, size = 22 }: { type: string; size?: number }) {
  const c = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (type) {
    case 'star':
      return (
        <svg {...c}>
          <path d="M12 3l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 3Z" />
        </svg>
      )
    case 'trend':
      return (
        <svg {...c}>
          <path d="M3 17l5-5 4 3 6-7" />
          <path d="M16 8h5v5" />
        </svg>
      )
    case 'medal':
      return (
        <svg {...c}>
          <circle cx="12" cy="14" r="6" />
          <path d="M9 8.5 7 3h10l-2 5.5" />
          <path d="M12 12.5l1 2 2 .2-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 14.7l2-.2 1-2Z" />
        </svg>
      )
    case 'trophy':
    default:
      return (
        <svg {...c}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4v2a3 3 0 0 0 3 3" />
          <path d="M17 6h3v2a3 3 0 0 1-3 3" />
        </svg>
      )
  }
}

/* ── ícones de campo ── */
function IconUser() {
  return (
    <svg className="tcl-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg className="tcl-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  )
}
