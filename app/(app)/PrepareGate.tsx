'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Animação de entrada ("Estamos preparando o sistema para você"). Enquanto roda,
// dispara em segundo plano o sync incremental (/api/sync/run) a partir do último
// watermark. Espera o sync terminar, com piso de ~2.2s e teto de ~8s; depois
// revela o sistema (router.refresh p/ trazer o dado fresco). Uma vez por sessão.
const KEY = 'tc-prepared-v1'
const MSGS = [
  'Buscando os dados mais recentes…',
  'Sincronizando a rádio…',
  'Montando os gráficos…',
  'Quase lá…',
]

export default function PrepareGate() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  const [msg, setMsg] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(KEY)) return
    setShow(true)

    const rot = setInterval(() => setMsg((m) => (m + 1) % MSGS.length), 1700)
    const minDur = new Promise<void>((r) => setTimeout(r, 2200))
    const cap = new Promise<void>((r) => setTimeout(r, 8000))
    const sync = fetch('/api/sync/run', { method: 'POST' }).then(() => {}).catch(() => {})

    Promise.race([Promise.all([sync, minDur]).then(() => {}), cap]).then(() => {
      clearInterval(rot)
      sessionStorage.setItem(KEY, '1')
      setClosing(true)
      setTimeout(() => {
        setShow(false)
        router.refresh()
      }, 480)
    })

    return () => clearInterval(rot)
  }, [router])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg, #0d1117)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
      opacity: closing ? 0 : 1, transition: 'opacity .45s ease',
    }}>
      {/* gráfico "se construindo" */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            width: 22, borderRadius: '6px 6px 2px 2px',
            background: 'linear-gradient(180deg, var(--chart-2, #36b9a6), var(--accent, #f5a623))',
            animation: `tcGrow 1.25s ${i * 0.13}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.4px', color: 'var(--text, #e6edf3)' }}>
          Estamos preparando o sistema para você
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-dim, #8b949e)', marginTop: 8, minHeight: 18 }}>
          {MSGS[msg]}
        </div>
      </div>

      {/* barra de progresso indeterminada */}
      <div style={{ width: 240, height: 4, borderRadius: 4, background: 'var(--surface-2, #21262d)', overflow: 'hidden' }}>
        <div style={{ width: '40%', height: '100%', borderRadius: 4, background: 'var(--chart-2, #36b9a6)', animation: 'tcSlide 1.3s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes tcGrow { 0%,100% { height: 24px; opacity:.55 } 50% { height: 110px; opacity:1 } }
        @keyframes tcSlide { 0% { transform: translateX(-110%) } 100% { transform: translateX(360%) } }
      `}</style>
    </div>
  )
}
